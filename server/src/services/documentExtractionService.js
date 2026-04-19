import path from "path";

import { extractPdfText } from "./pdfTextExtractor.js";

const decodeHtmlEntities = (html = "") =>
  html
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

export const looksLikeHtml = (value = "") => /<\/?[a-z][\s\S]*>/i.test(value);

export const stripHtmlToText = (html = "") =>
  decodeHtmlEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeRemoteUrl = (value = "", baseUrl = "") => {
  try {
    const url = new URL(value, baseUrl);
    if (["http:", "https:"].includes(url.protocol)) {
      return url.toString();
    }
  } catch {}

  return "";
};

export const extractLinksFromHtml = (html = "", baseUrl = "") => {
  const links = [];
  const linkPattern =
    /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkPattern)) {
    const href = match[1] || match[2] || match[3] || "";
    const url = normalizeRemoteUrl(href, baseUrl);
    if (!url) {
      continue;
    }

    links.push({
      url,
      text: stripHtmlToText(match[4] || "").slice(0, 140),
    });
  }

  return Array.from(new Map(links.map((link) => [link.url, link])).values());
};

const fetchRemoteBuffer = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; UrbanGrowthConnector/1.0; +https://localhost)",
        accept:
          "text/html,application/pdf,text/plain,application/json,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-IN,en;q=0.9",
      },
    });

    if (!response.ok) {
      const error = new Error(`Unable to fetch source document: ${response.status}`);
      error.statusCode = 400;
      throw error;
    }

    return {
      finalUrl: response.url,
      contentType: response.headers.get("content-type") || "",
      buffer: Buffer.from(await response.arrayBuffer()),
    };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Source request timed out.");
      timeoutError.statusCode = 408;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchRemoteDocument = async (url, fileName = "") => {
  const remote = await fetchRemoteBuffer(url);
  const inferredName = fileName || remote.finalUrl.split("/").pop() || "remote-source";

  if (remote.contentType.includes("pdf") || inferredName.toLowerCase().endsWith(".pdf")) {
    return {
      ...remote,
      fileName: inferredName,
      html: "",
      rawText: "",
      text: await extractPdfText(remote.buffer, inferredName),
    };
  }

  const rawText = remote.buffer.toString("utf8");
  return {
    ...remote,
    fileName: inferredName,
    rawText,
    html: looksLikeHtml(rawText) ? rawText : "",
    text: looksLikeHtml(rawText) ? stripHtmlToText(rawText) : rawText.trim(),
  };
};

export const extractDocumentText = async ({
  buffer,
  fileName = "",
  rawText = "",
  url = "",
}) => {
  if (rawText) {
    return looksLikeHtml(rawText) ? stripHtmlToText(rawText) : rawText.trim();
  }

  if (buffer) {
    const extension = path.extname(fileName).toLowerCase();

    if (extension === ".pdf") {
      return extractPdfText(buffer, fileName);
    }

    const rawBufferText = buffer.toString("utf8");
    return looksLikeHtml(rawBufferText) ? stripHtmlToText(rawBufferText) : rawBufferText.trim();
  }

  if (!url) {
    return "";
  }

  const remoteDocument = await fetchRemoteDocument(url, fileName);
  return remoteDocument.text;
};
