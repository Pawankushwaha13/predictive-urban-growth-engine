import { demoMarketSources, marketConnectorProfiles } from "../data/sourceTemplates.js";
import {
  fetchRemoteDocument,
  looksLikeHtml,
  stripHtmlToText,
} from "./documentExtractionService.js";
import { findZoneReferencesInText, resolveZoneReference } from "./zoneReferenceService.js";
import { parseStructuredFile } from "../utils/parseStructuredFile.js";
import { normalizeRecord } from "../utils/normalizeRecord.js";

const connectorProfilesById = new Map(marketConnectorProfiles.map((profile) => [profile.id, profile]));
const structuredFilePattern = /\.(json|csv|xlsx|xls|xlsm)$/i;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round1 = (value) => Math.round(value * 10) / 10;
const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeProviderKey = (value = "") => {
  const normalizedValue = String(value).toLowerCase();

  if (normalizedValue.includes("99acres")) {
    return "99acres";
  }

  if (normalizedValue.includes("magic")) {
    return "magicbricks";
  }

  return "generic";
};

const inferProvider = (source = {}) => {
  const profile = connectorProfilesById.get(source.connectorId || "");
  return normalizeProviderKey(profile?.provider || source.provider || source.url || source.label);
};

const inferStructuredFileName = (rawText = "", fileName = "market-feed.json") => {
  if (structuredFilePattern.test(fileName)) {
    return fileName;
  }

  const trimmedText = rawText.trim();
  if (trimmedText.startsWith("{") || trimmedText.startsWith("[")) {
    return "market-feed.json";
  }

  const firstLine = trimmedText.split(/\r?\n/, 1)[0] || "";
  if (firstLine.includes(",")) {
    return "market-feed.csv";
  }

  return fileName;
};

const parseRowsFromText = (rawText = "", fileName = "market-feed.json") =>
  parseStructuredFile(Buffer.from(rawText, "utf8"), inferStructuredFileName(rawText, fileName));

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const number = Number(String(value).replace(/[₹,%]/g, "").replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : undefined;
};

const extractFirstMatchingNumber = (text = "", patterns = []) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const number = toNumber(match?.[1]);
    if (number !== undefined) {
      return number;
    }
  }

  return undefined;
};

const extractMetaContent = (html = "", attribute, value) => {
  const patterns = [
    new RegExp(
      `<meta[^>]+${attribute}=["']${escapeRegex(value)}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${attribute}=["']${escapeRegex(value)}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return stripHtmlToText(match[1]);
    }
  }

  return "";
};

const extractTagText = (html = "", tagName = "") => {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1] ? stripHtmlToText(match[1]) : "";
};

const extractRelevantScriptText = (html = "") =>
  Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi))
    .map((match) => match[1].replace(/\s+/g, " ").trim())
    .filter((content) => /price|sqft|locality|listing|rent|yield|search|demand/i.test(content))
    .slice(0, 12)
    .join(" ");

const extractPricePerSqft = (text = "", labels = []) => {
  const labelPatterns = labels.map(
    (label) =>
      new RegExp(
        `${escapeRegex(label)}[^₹\\d]{0,36}(?:₹|rs\\.?\\s*)?([\\d,]{3,8}(?:\\.\\d+)?)\\s*(?:/|per)?\\s*(?:sq\\.?\\s*ft|sqft)?`,
        "i",
      ),
  );

  return extractFirstMatchingNumber(text, [
    ...labelPatterns,
    /(?:price(?:\s*per)?\s*sq\.?\s*ft|avg\.?\s*price)[^\d]{0,24}([\d,]{3,8}(?:\.\d+)?)/i,
    /(?:₹|rs\.?\s*)([\d,]{3,8}(?:\.\d+)?)[^\n]{0,18}(?:\/|per)\s*(?:sq\.?\s*ft|sqft)/i,
  ]);
};

const extractPercentMetric = (text = "", labels = []) => {
  const labelPatterns = labels.map(
    (label) => new RegExp(`${escapeRegex(label)}[^\\d]{0,24}(\\d+(?:\\.\\d+)?)\\s*%`, "i"),
  );

  return extractFirstMatchingNumber(text, [
    ...labelPatterns,
    /(?:yoy|annual growth|appreciation)[^\d]{0,24}(\d+(?:\.\d+)?)\s*%/i,
  ]);
};

const extractListingCount = (text = "") =>
  extractFirstMatchingNumber(text, [
    /([\d,]{1,6})\s+(?:listings|properties|projects|flats|apartments)\b/i,
    /(\d[\d,]{1,6})\s+(?:properties?\s+found|results)\b/i,
  ]);

const scoreListingDensity = (text = "", html = "") => {
  const explicitCount = extractListingCount(text);
  if (explicitCount !== undefined) {
    return clamp(Math.round(36 + Math.log10(explicitCount + 1) * 22), 34, 92);
  }

  const tokenMatches = (html.match(/listing|property|project|tuple|card/gi) || []).length;
  return clamp(30 + tokenMatches * 2, 28, 84);
};

const scoreSearchMomentum = (text = "", providerKey = "generic", listingDensityScore = 0) => {
  const explicitSearch = extractFirstMatchingNumber(text, [
    /(?:search(?:es| volume| demand| trend| popularity))[^\d]{0,24}([\d,]{1,6})/i,
  ]);

  if (explicitSearch !== undefined) {
    const normalizedSearch = explicitSearch > 100 ? 32 + Math.log10(explicitSearch) * 22 : explicitSearch;
    return clamp(Math.round(normalizedSearch), 30, 95);
  }

  let searchScore = Math.round(listingDensityScore * 0.92);

  if (/(trending|hot locality|popular choice|most searched|demand hotspot)/i.test(text)) {
    searchScore += 10;
  }

  if (providerKey === "99acres") {
    searchScore += 4;
  }

  return clamp(searchScore, 35, 95);
};

const scoreSupplyRisk = (text = "", listingDensityScore = 0) => {
  let riskScore = Math.round(18 + listingDensityScore * 0.35);

  if (/(oversupply|inventory overhang|heavy launches|saturation)/i.test(text)) {
    riskScore += 12;
  }

  if (/(limited supply|tight inventory|scarce supply)/i.test(text)) {
    riskScore -= 10;
  }

  return clamp(riskScore, 16, 82);
};

const buildMarketSourceTrace = (source = {}, providerKey = "generic", note = "") => [
  {
    label: source.label,
    kind: source.connectorId ? "portal-connector" : "market-feed",
    provider: source.provider || providerKey,
    url: source.url || "",
    capturedAt: new Date().toISOString(),
    note: note || "Listing density, price velocity, and absorption snapshot",
  },
];

const normalizeStructuredRow = (row, source, defaults) =>
  normalizeRecord(
    {
      ...row,
      sourceTrace: buildMarketSourceTrace(source, inferProvider(source)),
      metadata: {
        ...(row.metadata || {}),
        marketHarvest: {
          sourceId: source.id,
          connectorId: source.connectorId || null,
          provider: source.provider || "Portal snapshot",
        },
      },
    },
    {
      sourceDataset: "predictive-pipeline",
      defaults,
      ingestMethod: "market-harvest",
    },
  );

const buildUnstructuredMarketRecord = ({
  documentText = "",
  html = "",
  source = {},
  defaults = {},
}) => {
  const providerKey = inferProvider(source);
  const pageTitle =
    extractMetaContent(html, "property", "og:title") ||
    extractMetaContent(html, "name", "title") ||
    extractTagText(html, "h1") ||
    extractTagText(html, "title") ||
    defaults.title ||
    source.label ||
    "Portal market snapshot";
  const analysisText = [pageTitle, documentText, extractRelevantScriptText(html)]
    .filter(Boolean)
    .join(" ");

  const reference =
    resolveZoneReference({
      title: pageTitle,
      city: defaults.city,
      corridor: defaults.corridor,
      externalId: defaults.externalId,
    }) || findZoneReferencesInText(analysisText, defaults.city)[0] || null;

  const latitude = reference?.latitude ?? defaults.latitude;
  const longitude = reference?.longitude ?? defaults.longitude;

  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    const error = new Error(
      "Could not geolocate this portal page. Provide defaults JSON with city, corridor, latitude, and longitude.",
    );
    error.statusCode = 400;
    throw error;
  }

  const pricePerSqft = extractPricePerSqft(analysisText) || toNumber(defaults.pricePerSqft) || 0;
  const readyToMovePricePerSqft =
    extractPricePerSqft(analysisText, ["ready to move", "ready homes", "ready to move flats"]) ||
    toNumber(defaults.readyToMovePricePerSqft) ||
    Math.round(pricePerSqft * 1.12);
  const underConstructionPricePerSqft =
    extractPricePerSqft(analysisText, ["under construction", "under-construction", "new launch"]) ||
    toNumber(defaults.underConstructionPricePerSqft) ||
    Math.round(pricePerSqft * 0.98);
  const listingDensityScore =
    toNumber(defaults.listingDensityScore) || scoreListingDensity(analysisText, html);
  const searchMomentumScore =
    toNumber(defaults.searchMomentumScore) ||
    scoreSearchMomentum(analysisText, providerKey, listingDensityScore);
  const priceGrowthPct =
    toNumber(defaults.priceGrowthPct) ||
    extractPercentMetric(analysisText, ["price trend", "price growth", "appreciation"]) ||
    clamp(Math.round(searchMomentumScore * 0.18), 6, 22);
  const rentalYieldPct =
    toNumber(defaults.rentalYieldPct) ||
    extractPercentMetric(analysisText, ["rental yield", "yield"]) ||
    round1(providerKey === "magicbricks" ? 4 : 3.6);
  const rentalAbsorptionPct =
    toNumber(defaults.rentalAbsorptionPct) ||
    extractPercentMetric(analysisText, ["absorption", "occupancy", "tenant demand"]) ||
    clamp(Math.round(searchMomentumScore * 0.88 + priceGrowthPct * 0.8), 45, 90);
  const supplyRiskScore =
    toNumber(defaults.supplyRiskScore) || scoreSupplyRisk(analysisText, listingDensityScore);
  const priceToCityMedianRatio =
    toNumber(defaults.priceToCityMedianRatio) ||
    round1(clamp(pricePerSqft && readyToMovePricePerSqft ? pricePerSqft / readyToMovePricePerSqft : 0.95, 0.65, 1.25));

  return normalizeRecord(
    {
      externalId: source.externalId || reference?.externalId || "",
      title: reference?.title || pageTitle,
      description:
        defaults.description ||
        `Portal-derived market snapshot harvested from ${source.provider || providerKey}.`,
      city: reference?.city || defaults.city || "",
      state: reference?.state || defaults.state || "",
      corridor: reference?.corridor || defaults.corridor || "",
      latitude,
      longitude,
      sourceLink: source.url || defaults.sourceLink || "",
      tags: [
        ...(Array.isArray(defaults.tags) ? defaults.tags : []),
        `${providerKey}-connector`,
      ],
      pricePerSqft,
      priceGrowthPct,
      rentalYieldPct,
      rentalAbsorptionPct,
      listingDensityScore,
      searchMomentumScore,
      supplyRiskScore,
      priceToCityMedianRatio,
      readyToMovePricePerSqft,
      underConstructionPricePerSqft,
      sourceTrace: buildMarketSourceTrace(
        source,
        providerKey,
        `${source.connectorId || providerKey} connector extracted page-level metrics`,
      ),
      metadata: {
        pageTitle,
        marketHarvest: {
          sourceId: source.id,
          connectorId: source.connectorId || null,
          provider: source.provider || providerKey,
          mode: "html-scrape",
        },
      },
    },
    {
      sourceDataset: "predictive-pipeline",
      defaults,
      ingestMethod: "market-harvest",
    },
  );
};

const buildRecordsFromRawText = (source, defaults) => {
  const rawText = source.rawText || "";
  const effectiveFileName = inferStructuredFileName(rawText, source.fileName || "market-feed.json");

  if (!looksLikeHtml(rawText)) {
    try {
      const rows = parseRowsFromText(rawText, effectiveFileName);
      return rows.map((row) => normalizeStructuredRow(row, source, defaults));
    } catch {}
  }

  return [
    buildUnstructuredMarketRecord({
      documentText: looksLikeHtml(rawText) ? stripHtmlToText(rawText) : rawText,
      html: looksLikeHtml(rawText) ? rawText : "",
      source,
      defaults,
    }),
  ];
};

const buildRecordsFromUrl = async (source, defaults) => {
  const remoteDocument = await fetchRemoteDocument(source.url, source.fileName || source.label);
  const structuredByType =
    structuredFilePattern.test(remoteDocument.fileName || "") ||
    /json|csv|spreadsheet|excel/i.test(remoteDocument.contentType);

  if (structuredByType) {
    const rows = parseStructuredFile(remoteDocument.buffer, remoteDocument.fileName);
    return rows.map((row) =>
      normalizeStructuredRow(
        row,
        {
          ...source,
          url: remoteDocument.finalUrl,
        },
        defaults,
      ),
    );
  }

  return [
    buildUnstructuredMarketRecord({
      documentText: remoteDocument.text,
      html: remoteDocument.html,
      source: {
        ...source,
        url: remoteDocument.finalUrl,
      },
      defaults,
    }),
  ];
};

const buildResolvedSource = (source = {}) => {
  const profile = connectorProfilesById.get(source.connectorId || "");

  return {
    ...profile,
    ...source,
    label: source.label || profile?.label || "Market source",
    provider: source.provider || profile?.provider || "Portal snapshot",
    url: source.url || profile?.defaultUrl || "",
  };
};

export const listMarketSourceTemplates = () => [
  ...marketConnectorProfiles.map((profile) => ({
    id: profile.id,
    label: profile.label,
    provider: profile.provider,
    inputModes: profile.inputModes,
    kind: "live-connector",
  })),
  ...demoMarketSources.map((source) => ({
    id: source.id,
    label: source.label,
    provider: source.provider,
    kind: "demo-pack",
  })),
];

export const harvestMarketSources = async ({ mode = "demo", sources = [], defaults = {} } = {}) => {
  const activeSources = mode === "demo" || !sources.length ? demoMarketSources : sources;
  const normalizedRecords = [];
  let rowCount = 0;

  for (const sourceInput of activeSources) {
    const source = buildResolvedSource(sourceInput);
    let harvestedRecords = [];

    if (source.rows?.length) {
      harvestedRecords = source.rows.map((row) => normalizeStructuredRow(row, source, defaults));
    } else if (source.rawText) {
      harvestedRecords = buildRecordsFromRawText(source, defaults);
    } else if (source.url) {
      harvestedRecords = await buildRecordsFromUrl(source, defaults);
    }

    rowCount += harvestedRecords.length;
    normalizedRecords.push(...harvestedRecords);
  }

  return {
    records: normalizedRecords,
    summary: {
      sourceCount: activeSources.length,
      rowCount,
      zoneCount: normalizedRecords.length,
    },
  };
};
