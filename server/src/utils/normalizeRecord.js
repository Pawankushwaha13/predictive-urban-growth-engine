import path from "path";

import { enrichZoneRecord } from "../services/recordEnrichmentService.js";

const FIELD_ALIASES = {
  title: ["title", "zoneName", "zone", "microMarket", "name"],
  description: ["description", "summary", "thesis", "notes"],
  city: ["city", "municipalCity", "districtCity"],
  state: ["state", "region", "province"],
  corridor: ["corridor", "submarket", "cluster", "microCorridor"],
  sourceDataset: ["sourceDataset", "dataset", "collection", "feed"],
  latitude: ["latitude", "lat", "y"],
  longitude: ["longitude", "lng", "lon", "x"],
  sourceLink: ["sourceLink", "url", "link", "reference"],
  tags: ["tags", "keywords", "labels"],
  pricePerSqft: ["pricePerSqft", "avgPricePerSqft", "sellingPricePerSqft", "price_psf"],
  priceGrowthPct: ["priceGrowthPct", "pricingVelocity", "priceAppreciationPct", "priceGrowth"],
  rentalYieldPct: ["rentalYieldPct", "yieldPct", "rentalYield"],
  rentalAbsorptionPct: ["rentalAbsorptionPct", "rentalAbsorption", "absorptionRate"],
  listingDensityScore: ["listingDensityScore", "listingDensity", "developerActivityScore"],
  searchMomentumScore: ["searchMomentumScore", "searchVolumeScore", "searchMomentum"],
  permitMomentumScore: ["permitMomentumScore", "permitMomentum", "tenderMomentumScore"],
  cluMomentumScore: ["cluMomentumScore", "cluChangeScore", "landUseChangeScore"],
  infrastructureBoostScore: [
    "infrastructureBoostScore",
    "municipalBoostScore",
    "infrastructureScore",
  ],
  supplyRiskScore: ["supplyRiskScore", "inventoryRiskScore", "supplyRisk"],
  monthsToCatalyst: ["monthsToCatalyst", "monthsToExecution", "timeToCatalyst"],
  priceToCityMedianRatio: ["priceToCityMedianRatio", "cityMedianRatio", "relativePriceRatio"],
  readyToMovePricePerSqft: [
    "readyToMovePricePerSqft",
    "readyPricePerSqft",
    "readyInventoryPricePerSqft",
  ],
  underConstructionPricePerSqft: [
    "underConstructionPricePerSqft",
    "underConstructionPsf",
    "ucPricePerSqft",
  ],
  readyToMovePremiumPct: ["readyToMovePremiumPct", "readyPremiumPct"],
  underConstructionDiscountPct: ["underConstructionDiscountPct", "ucDiscountPct"],
  municipalSignals: ["municipalSignals", "signals", "pipelineSignals"],
  sourceTrace: ["sourceTrace", "sources", "provenance"],
  mediaUrl: ["mediaUrl", "imageUrl", "photoUrl"],
  mediaType: ["mediaType", "mimeType"],
  externalId: ["externalId", "id", "_id", "recordId"],
};

const getFirstValue = (record, keys) => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") {
      return record[key];
    }
  }

  return undefined;
};

const buildFieldKeys = (fieldMap = {}, fieldName) => {
  const customField = fieldMap[fieldName];
  if (!customField) {
    return FIELD_ALIASES[fieldName];
  }

  return [customField, ...FIELD_ALIASES[fieldName]];
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const normalizedValue =
    typeof value === "string"
      ? value.replace(/,/g, "").replace(/%/g, "").trim()
      : value;
  const number = Number(normalizedValue);
  return Number.isFinite(number) ? number : undefined;
};

const toTags = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim());
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const inferMediaType = (url = "") => {
  const extension = path.extname(url).toLowerCase();

  if ([".jpg", ".jpeg"].includes(extension)) {
    return "image/jpeg";
  }

  if (extension === ".png") {
    return "image/png";
  }

  return "";
};

const parseMunicipalSignals = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(trimmedValue);
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
      return trimmedValue
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => ({
          title: item,
          category: "utility",
          status: "announced",
          impact: 0.6,
          monthsToExecution: 30,
          confidence: 65,
        }));
    }
  }

  return [];
};

const parseSourceTrace = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsedValue = JSON.parse(value);
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const normalizeRecord = (input, options = {}) => {
  const fieldMap = options.fieldMap || {};
  const defaults = options.defaults || {};

  const latitude =
    toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "latitude"))) ??
    toNumber(defaults.latitude);
  const longitude =
    toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "longitude"))) ??
    toNumber(defaults.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Every zone requires valid latitude and longitude.");
  }

  const mediaUrl =
    String(getFirstValue(input, buildFieldKeys(fieldMap, "mediaUrl")) || defaults.mediaUrl || "")
      .trim();

  const mediaType =
    String(getFirstValue(input, buildFieldKeys(fieldMap, "mediaType")) || defaults.mediaType || "")
      .trim() || inferMediaType(mediaUrl);

  const zone = {
    title: String(
      getFirstValue(input, buildFieldKeys(fieldMap, "title")) ||
        defaults.title ||
        "Untitled growth zone",
    ).trim(),
    description: String(
      getFirstValue(input, buildFieldKeys(fieldMap, "description")) ||
        defaults.description ||
        "",
    ).trim(),
    city: String(getFirstValue(input, buildFieldKeys(fieldMap, "city")) || defaults.city || "").trim(),
    state: String(
      getFirstValue(input, buildFieldKeys(fieldMap, "state")) || defaults.state || "",
    ).trim(),
    corridor: String(
      getFirstValue(input, buildFieldKeys(fieldMap, "corridor")) || defaults.corridor || "",
    ).trim(),
    sourceDataset: String(
      getFirstValue(input, buildFieldKeys(fieldMap, "sourceDataset")) ||
        options.sourceDataset ||
        defaults.sourceDataset ||
        "manual",
    ).trim(),
    latitude,
    longitude,
    sourceLink: String(
      getFirstValue(input, buildFieldKeys(fieldMap, "sourceLink")) ||
        defaults.sourceLink ||
        "",
    ).trim(),
    tags: toTags(getFirstValue(input, buildFieldKeys(fieldMap, "tags")) ?? defaults.tags),
    pricePerSqft:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "pricePerSqft"))) ??
      toNumber(defaults.pricePerSqft) ??
      0,
    priceGrowthPct:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "priceGrowthPct"))) ??
      toNumber(defaults.priceGrowthPct) ??
      0,
    rentalYieldPct:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "rentalYieldPct"))) ??
      toNumber(defaults.rentalYieldPct) ??
      0,
    rentalAbsorptionPct:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "rentalAbsorptionPct"))) ??
      toNumber(defaults.rentalAbsorptionPct) ??
      0,
    listingDensityScore:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "listingDensityScore"))) ??
      toNumber(defaults.listingDensityScore) ??
      0,
    searchMomentumScore:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "searchMomentumScore"))) ??
      toNumber(defaults.searchMomentumScore) ??
      0,
    permitMomentumScore:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "permitMomentumScore"))) ??
      toNumber(defaults.permitMomentumScore) ??
      0,
    cluMomentumScore:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "cluMomentumScore"))) ??
      toNumber(defaults.cluMomentumScore) ??
      0,
    infrastructureBoostScore:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "infrastructureBoostScore"))) ??
      toNumber(defaults.infrastructureBoostScore) ??
      0,
    supplyRiskScore:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "supplyRiskScore"))) ??
      toNumber(defaults.supplyRiskScore) ??
      0,
    monthsToCatalyst:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "monthsToCatalyst"))) ??
      toNumber(defaults.monthsToCatalyst) ??
      36,
    priceToCityMedianRatio:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "priceToCityMedianRatio"))) ??
      toNumber(defaults.priceToCityMedianRatio) ??
      1,
    readyToMovePricePerSqft:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "readyToMovePricePerSqft"))) ??
      toNumber(defaults.readyToMovePricePerSqft) ??
      0,
    underConstructionPricePerSqft:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "underConstructionPricePerSqft"))) ??
      toNumber(defaults.underConstructionPricePerSqft) ??
      0,
    readyToMovePremiumPct:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "readyToMovePremiumPct"))) ??
      toNumber(defaults.readyToMovePremiumPct),
    underConstructionDiscountPct:
      toNumber(getFirstValue(input, buildFieldKeys(fieldMap, "underConstructionDiscountPct"))) ??
      toNumber(defaults.underConstructionDiscountPct),
    municipalSignals: parseMunicipalSignals(
      getFirstValue(input, buildFieldKeys(fieldMap, "municipalSignals")) ?? defaults.municipalSignals,
    ),
    sourceTrace: parseSourceTrace(
      getFirstValue(input, buildFieldKeys(fieldMap, "sourceTrace")) ?? defaults.sourceTrace,
    ),
    mediaUrl,
    mediaType,
    metadata: {
      ...(defaults.metadata || {}),
      ...(typeof input.metadata === "object" && input.metadata !== null ? input.metadata : {}),
    },
    rawPayload: input,
    externalId: String(
      getFirstValue(input, buildFieldKeys(fieldMap, "externalId")) || defaults.externalId || "",
    ).trim(),
    ingestMethod: options.ingestMethod || defaults.ingestMethod || "manual-upload",
  };

  return enrichZoneRecord(zone);
};
