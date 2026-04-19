const toPathSegment = (value) => {
  if (Array.isArray(value)) {
    return value.join("/");
  }

  return value || "";
};

export default async function handler(req, res) {
  try {
    const { default: app } = await import("../server/src/app.js");
    const requestUrl = new URL(req.url || "/api", "http://localhost");
    const routePath = toPathSegment(req.query?.path);

    requestUrl.searchParams.delete("path");
    req.url = `/api${routePath ? `/${routePath}` : ""}${requestUrl.search}`;

    return app(req, res);
  } catch (error) {
    console.error("Vercel API bootstrap failed.", error);

    return res.status(500).json({
      message: "Vercel API bootstrap failed.",
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    });
  }
}
