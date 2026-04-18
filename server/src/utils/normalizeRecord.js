import path from "path";

const FIELD_ALIASES = {
  title: ["title", "name", "headline", "reportTitle"],
  description: ["description", "summary", "details", "notes", "body"],
  sourceType: ["sourceType", "type", "intelType", "category"],
  sourceDataset: ["sourceDataset", "dataset", "collection", "feed"],
  locationName: ["locationName", "location", "place", "area", "site"],
  latitude: ["latitude", "lat", "y"],
  longitude: ["longitude", "lng", "lon", "x"],
  eventTime: ["eventTime", "timestamp", "time", "reportedAt", "date"],
  sourceLink: ["sourceLink", "url", "link", "reference"],
  confidence: ["confidence", "score", "reliability"],
  tags: ["tags", "keywords", "labels"],
  mediaUrl: ["mediaUrl", "imageUrl", "imageryUrl", "photoUrl"],
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

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const toDate = (value) => {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const toConfidence = (value) => {
  if (value === undefined || value === null || value === "") {
    return 50;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 50;
  }

  if (number >= 0 && number <= 1) {
    return Math.round(number * 100);
  }

  return Math.max(0, Math.min(100, Math.round(number)));
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

const toSourceType = (value, fallback = "HUMINT") => {
  const normalized = String(value || fallback).trim().toUpperCase();

  if (["OSINT", "HUMINT", "IMINT"].includes(normalized)) {
    return normalized;
  }

  return fallback;
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
    throw new Error("Every intelligence record requires valid latitude and longitude.");
  }

  const mediaUrl =
    String(getFirstValue(input, buildFieldKeys(fieldMap, "mediaUrl")) || defaults.mediaUrl || "")
      .trim();

  const mediaType =
    String(getFirstValue(input, buildFieldKeys(fieldMap, "mediaType")) || defaults.mediaType || "")
      .trim() || inferMediaType(mediaUrl);

  return {
    title: String(
      getFirstValue(input, buildFieldKeys(fieldMap, "title")) ||
        defaults.title ||
        "Untitled intelligence node",
    ).trim(),
    description: String(
      getFirstValue(input, buildFieldKeys(fieldMap, "description")) ||
        defaults.description ||
        "",
    ).trim(),
    sourceType: toSourceType(
      getFirstValue(input, buildFieldKeys(fieldMap, "sourceType")),
      options.defaultSourceType || "HUMINT",
    ),
    sourceDataset: String(
      getFirstValue(input, buildFieldKeys(fieldMap, "sourceDataset")) ||
        options.sourceDataset ||
        defaults.sourceDataset ||
        "manual",
    ).trim(),
    locationName: String(
      getFirstValue(input, buildFieldKeys(fieldMap, "locationName")) ||
        defaults.locationName ||
        "",
    ).trim(),
    latitude,
    longitude,
    eventTime: toDate(getFirstValue(input, buildFieldKeys(fieldMap, "eventTime")) || defaults.eventTime),
    sourceLink: String(
      getFirstValue(input, buildFieldKeys(fieldMap, "sourceLink")) ||
        defaults.sourceLink ||
        "",
    ).trim(),
    confidence: toConfidence(
      getFirstValue(input, buildFieldKeys(fieldMap, "confidence")) ?? defaults.confidence,
    ),
    tags: toTags(getFirstValue(input, buildFieldKeys(fieldMap, "tags")) ?? defaults.tags),
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
};

