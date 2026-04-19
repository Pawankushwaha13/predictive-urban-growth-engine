import { demoMunicipalSources, municipalConnectorProfiles } from "../data/sourceTemplates.js";
import {
  extractDocumentText,
  extractLinksFromHtml,
  fetchRemoteDocument,
} from "./documentExtractionService.js";
import {
  findZoneReferencesInText,
  getZoneReferenceByExternalId,
  resolveZoneReference,
} from "./zoneReferenceService.js";

const connectorProfilesById = new Map(
  municipalConnectorProfiles.map((profile) => [profile.id, profile]),
);

const keywordConfig = [
  { category: "metro", keywords: ["metro", "station", "rapid transit"], impact: 0.97 },
  { category: "transit", keywords: ["interchange", "bus terminal", "connector"], impact: 0.84 },
  { category: "expressway", keywords: ["expressway", "orr", "ring road"], impact: 0.9 },
  { category: "road", keywords: ["road widening", "flyover", "corridor", "road"], impact: 0.82 },
  { category: "utility", keywords: ["sewer", "water", "drainage", "substation", "utility"], impact: 0.7 },
  { category: "clu", keywords: ["land use", "clu", "zoning", "commercial zoning"], impact: 0.83 },
];

const linkKeywords = [
  "tender",
  "notice",
  "work",
  "project",
  "metro",
  "road",
  "sewer",
  "water",
  "drainage",
  "zoning",
  "clu",
  "corrigendum",
  "pdf",
];

const inferStatus = (text = "") => {
  const normalizedText = text.toLowerCase();

  if (normalizedText.includes("under construction") || normalizedText.includes("active construction")) {
    return "under-construction";
  }

  if (normalizedText.includes("tender") || normalizedText.includes("bid")) {
    return "tendered";
  }

  if (normalizedText.includes("approved") || normalizedText.includes("sanctioned")) {
    return "approved";
  }

  return "announced";
};

const inferMonthsToExecution = (text = "") => {
  const explicitMonthsMatch = text.match(/(\d{1,2})\s*(month|months)/i);
  if (explicitMonthsMatch) {
    return Number(explicitMonthsMatch[1]);
  }

  if (/next\s+year|12\s+month/i.test(text)) {
    return 12;
  }

  if (/18/i.test(text)) {
    return 18;
  }

  if (/24/i.test(text)) {
    return 24;
  }

  return 24;
};

const buildSignalsFromText = (text = "") => {
  const snippets = text
    .split(/[\n\r]+|[.?!]/)
    .map((snippet) => snippet.trim())
    .filter(Boolean);

  return snippets.flatMap((snippet) => {
    const normalizedSnippet = snippet.toLowerCase();
    const matchingConfig = keywordConfig.find((config) =>
      config.keywords.some((keyword) => normalizedSnippet.includes(keyword)),
    );

    if (!matchingConfig) {
      return [];
    }

    return [
      {
        title: snippet.slice(0, 140),
        category: matchingConfig.category,
        status: inferStatus(snippet),
        impact: matchingConfig.impact,
        monthsToExecution: inferMonthsToExecution(snippet),
        confidence: matchingConfig.category === "clu" ? 76 : 82,
      },
    ];
  });
};

const buildResolvedSource = (source = {}) => {
  const profile = connectorProfilesById.get(source.profileId) || null;

  return {
    ...profile,
    ...source,
    label: source.label || profile?.label || "Municipal source",
    provider: source.provider || profile?.provider || "Government portal / PDF",
    sourceUrl: source.sourceUrl || profile?.defaultUrl || "",
    sourceType: source.sourceType || profile?.sourceType || "website",
    crawlLinkedDocuments:
      source.crawlLinkedDocuments ?? profile?.crawlLinkedDocuments ?? Boolean(source.sourceUrl),
    maxLinkedDocuments: Number(source.maxLinkedDocuments || profile?.maxLinkedDocuments || 3),
    focusTerms: source.focusTerms || profile?.focusTerms || [],
  };
};

const scoreCandidateLink = (link, source = {}) => {
  const composite = `${link.url} ${link.text} ${(source.focusTerms || []).join(" ")}`.toLowerCase();
  const host = source.sourceUrl ? new URL(source.sourceUrl).host : "";
  let score = 0;

  if (link.url.toLowerCase().endsWith(".pdf")) {
    score += 5;
  }

  if (host && new URL(link.url).host === host) {
    score += 2;
  }

  linkKeywords.forEach((keyword) => {
    if (composite.includes(keyword)) {
      score += 2;
    }
  });

  return score;
};

const expandMunicipalSource = async (source = {}) => {
  const resolvedSource = buildResolvedSource(source);

  if (resolvedSource.buffer || resolvedSource.rawText || !resolvedSource.sourceUrl) {
    return {
      sources: [resolvedSource],
      crawledDocumentCount: 0,
    };
  }

  const landingDocument = await fetchRemoteDocument(
    resolvedSource.sourceUrl,
    resolvedSource.fileName || resolvedSource.label,
  );

  const primarySource = {
    ...resolvedSource,
    sourceUrl: landingDocument.finalUrl,
    rawText: landingDocument.text,
    sourceType: landingDocument.contentType.includes("pdf") ? "pdf" : "html",
  };

  if (!resolvedSource.crawlLinkedDocuments || !landingDocument.html) {
    return {
      sources: [primarySource],
      crawledDocumentCount: 0,
    };
  }

  const candidateLinks = extractLinksFromHtml(landingDocument.html, landingDocument.finalUrl)
    .map((link) => ({
      ...link,
      score: scoreCandidateLink(link, resolvedSource),
    }))
    .filter((link) => link.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, resolvedSource.maxLinkedDocuments);

  const linkedSources = [];

  for (const [index, link] of candidateLinks.entries()) {
    try {
      const linkedDocument = await fetchRemoteDocument(link.url, link.text || `municipal-doc-${index + 1}`);
      linkedSources.push({
        ...resolvedSource,
        id: `${resolvedSource.id || resolvedSource.label}-linked-${index + 1}`,
        label: `${resolvedSource.label} · ${link.text || `Linked document ${index + 1}`}`,
        sourceUrl: linkedDocument.finalUrl,
        rawText: linkedDocument.text,
        sourceType: linkedDocument.contentType.includes("pdf") ? "pdf" : "html",
        parentSourceUrl: landingDocument.finalUrl,
      });
    } catch {}
  }

  return {
    sources: [primarySource, ...linkedSources],
    crawledDocumentCount: linkedSources.length,
  };
};

const mergeSignalsIntoZone = (existingZone, signals, source) => {
  const mergedSignals = [...(existingZone.municipalSignals || []), ...signals];
  const permitSignalCount = mergedSignals.filter((signal) =>
    ["road", "metro", "transit", "expressway"].includes(signal.category),
  ).length;
  const cluSignalCount = mergedSignals.filter((signal) => signal.category === "clu").length;
  const utilitySignalCount = mergedSignals.filter((signal) => signal.category === "utility").length;

  return {
    ...existingZone,
    description:
      existingZone.description ||
      `Harvested municipal bulletin evidence for ${existingZone.title}.`,
    sourceLink: source.sourceUrl || existingZone.sourceLink || "",
    sourceDataset: "predictive-pipeline",
    ingestMethod: "municipal-harvest",
    municipalSignals: mergedSignals,
    permitMomentumScore: Math.min(95, 45 + permitSignalCount * 14),
    cluMomentumScore: Math.min(92, 35 + cluSignalCount * 22),
    infrastructureBoostScore: Math.min(95, 50 + (permitSignalCount + utilitySignalCount) * 12),
    sourceTrace: [
      ...(existingZone.sourceTrace || []),
      {
        label: source.label,
        kind: "municipal-document",
        provider: source.provider || "Government portal / PDF",
        url: source.sourceUrl || "",
        capturedAt: new Date().toISOString(),
        note: `${signals.length} extracted municipal signals${
          source.parentSourceUrl ? " from linked document crawl" : ""
        }`,
      },
    ],
    metadata: {
      ...(existingZone.metadata || {}),
      municipalHarvest: {
        sourceId: source.id,
        snippetCount: signals.length,
        crawledFrom: source.parentSourceUrl || null,
      },
    },
  };
};

export const listMunicipalSourceTemplates = () => [
  ...municipalConnectorProfiles.map((profile) => ({
    id: profile.id,
    label: profile.label,
    provider: profile.provider,
    city: profile.city,
    sourceType: profile.sourceType,
    defaultUrl: profile.defaultUrl,
    kind: "live-connector",
  })),
  ...demoMunicipalSources.map((source) => ({
    id: source.id,
    label: source.label,
    sourceType: source.sourceType,
    kind: "demo-pack",
  })),
];

export const harvestMunicipalSources = async ({ mode = "demo", sources = [], defaults = {} } = {}) => {
  const activeSources = mode === "demo" || !sources.length ? demoMunicipalSources : sources;
  const zoneMap = new Map();
  let expandedSourceCount = 0;
  let extractedSignalCount = 0;
  let crawledDocumentCount = 0;

  for (const activeSource of activeSources) {
    const expansion = await expandMunicipalSource(activeSource);
    expandedSourceCount += expansion.sources.length;
    crawledDocumentCount += expansion.crawledDocumentCount;

    for (const source of expansion.sources) {
      const extractedText = await extractDocumentText(source);
      const signals = buildSignalsFromText(extractedText);
      extractedSignalCount += signals.length;

      const matchedReferences = source.externalId
        ? [getZoneReferenceByExternalId(source.externalId)].filter(Boolean)
        : findZoneReferencesInText(extractedText, defaults.city);

      const referencesToUse =
        matchedReferences.length > 0
          ? matchedReferences
          : [
              resolveZoneReference({
                title: defaults.title || source.label,
                city: defaults.city,
                corridor: defaults.corridor,
                externalId: defaults.externalId,
              }),
            ].filter(Boolean);

      for (const reference of referencesToUse) {
        const zoneKey = `${reference.externalId}:${reference.city}`;
        const existingZone = zoneMap.get(zoneKey) || {
          externalId: reference.externalId,
          title: reference.title,
          city: reference.city,
          state: reference.state,
          corridor: reference.corridor,
          latitude: reference.latitude,
          longitude: reference.longitude,
          municipalSignals: [],
          sourceTrace: [],
          metadata: {},
        };

        zoneMap.set(zoneKey, mergeSignalsIntoZone(existingZone, signals, source));
      }
    }
  }

  return {
    records: Array.from(zoneMap.values()),
    summary: {
      sourceCount: activeSources.length,
      expandedSourceCount,
      crawledDocumentCount,
      zoneCount: zoneMap.size,
      extractedSignalCount,
    },
  };
};
