import app from "./server/src/app.js";

const toPathSegment = (value) => {
  if (Array.isArray(value)) {
    return value.join("/");
  }

  return value || "";
};

export default function handler(req, res) {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  const routePath = toPathSegment(req.query?.path);

  requestUrl.searchParams.delete("path");
  req.url = `/api${routePath ? `/${routePath}` : ""}${requestUrl.search}`;

  return app(req, res);
}
