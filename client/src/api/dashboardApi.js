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

export const fetchRecords = async (filters = {}) => {
  const searchParams = new URLSearchParams();

  if (filters.sourceType && filters.sourceType !== "ALL") {
    searchParams.set("sourceType", filters.sourceType);
  }

  if (filters.search) {
    searchParams.set("search", filters.search);
  }

  if (filters.hasMedia) {
    searchParams.set("hasMedia", "true");
  }

  return request(`/intelligence?${searchParams.toString()}`);
};

export const fetchSummary = async () => request("/intelligence/summary");

export const seedRecords = async () =>
  request("/intelligence/seed", {
    method: "POST",
  });

export const uploadStructuredFile = async (formData) =>
  request("/ingestion/manual", {
    method: "POST",
    body: formData,
  });

export const uploadImages = async (formData) =>
  request("/ingestion/images", {
    method: "POST",
    body: formData,
  });

export const syncMongo = async (payload) =>
  request("/connectors/mongodb/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const syncS3 = async (payload) =>
  request("/connectors/s3/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
