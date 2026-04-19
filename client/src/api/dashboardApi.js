const API_BASE_URL = (
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api")
).replace(/\/$/, "");
const MEDIA_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }

  return payload;
};

export const resolveMediaUrl = (mediaUrl) => {
  if (!mediaUrl) {
    return "";
  }

  if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
    return mediaUrl;
  }

  return `${MEDIA_BASE_URL}${mediaUrl}`;
};

export const fetchZones = async () => request("/zones");

export const fetchSummary = async () => request("/zones/summary");

export const fetchConnectorTemplates = async () => request("/connectors/templates");

export const seedZones = async () =>
  request("/zones/seed", {
    method: "POST",
  });

export const uploadZoneDataset = async (formData) =>
  request("/ingestion/manual", {
    method: "POST",
    body: formData,
  });

export const runMunicipalHarvest = async (formData) =>
  request("/connectors/municipal/harvest", {
    method: "POST",
    body: formData,
  });

export const runMarketHarvest = async (payload) =>
  request("/connectors/market/harvest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const runPredictivePipeline = async (payload = { mode: "demo" }) =>
  request("/connectors/pipeline/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
