import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { MongoClient } from "mongodb";

import {
  listMarketSourceTemplates,
  harvestMarketSources,
} from "../services/marketHarvester.js";
import {
  listMunicipalSourceTemplates,
  harvestMunicipalSources,
} from "../services/municipalHarvester.js";
import { runUrbanGrowthPipeline } from "../services/urbanGrowthPipelineService.js";
import { upsertIntelligenceRecords } from "../repositories/intelligenceRepository.js";
import { normalizeRecord } from "../utils/normalizeRecord.js";
import { parseStructuredFile } from "../utils/parseStructuredFile.js";
import { streamToBuffer } from "../utils/streamHelpers.js";

const inferS3ObjectUrl = (bucket, region, key) =>
  `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, "/")}`;

const parseOptionalJson = (value, fallback = {}) => {
  if (!value) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const getConnectorTemplates = (_req, res) => {
  res.json({
    data: {
      municipal: listMunicipalSourceTemplates(),
      market: listMarketSourceTemplates(),
    },
  });
};

export const syncMongoSource = async (req, res, next) => {
  const mongoClient = new MongoClient(
    req.body.uri || process.env.MONGODB_SYNC_URI || process.env.DATABASE_URI,
  );

  try {
    const databaseName = req.body.database || process.env.MONGODB_SYNC_DATABASE;
    const collectionName = req.body.collection || process.env.MONGODB_SYNC_COLLECTION;
    const limit = Number(req.body.limit) || 100;
    const query = req.body.query || {};

    if (!databaseName || !collectionName) {
      const error = new Error("Provide MongoDB database and collection names to sync.");
      error.statusCode = 400;
      throw error;
    }

    await mongoClient.connect();

    const documents = await mongoClient
      .db(databaseName)
      .collection(collectionName)
      .find(query)
      .limit(limit)
      .toArray();

    const records = documents.map((document) =>
      normalizeRecord(document, {
        sourceDataset: req.body.sourceDataset || `mongo:${collectionName}`,
        fieldMap: req.body.fieldMap || {},
        defaults: req.body.defaults || {},
        ingestMethod: "mongo-sync",
      }),
    );

    const synced = await upsertIntelligenceRecords(records);

    res.json({
      message: "MongoDB zone sync completed.",
      pulled: documents.length,
      stored: synced.length,
    });
  } catch (error) {
    next(error);
  } finally {
    await mongoClient.close();
  }
};

export const syncS3Source = async (req, res, next) => {
  try {
    const region = req.body.region || process.env.AWS_REGION;
    const bucket = req.body.bucket || process.env.AWS_S3_BUCKET;
    const prefix = req.body.prefix ?? process.env.AWS_S3_PREFIX ?? "";
    const limit = Number(req.body.limit) || 50;

    if (!region || !bucket) {
      const error = new Error("Provide AWS region and S3 bucket to sync.");
      error.statusCode = 400;
      throw error;
    }

    const client = new S3Client({
      region,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });

    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: limit,
      }),
    );

    const objects = listResponse.Contents || [];
    const syncedRecords = [];

    for (const object of objects) {
      if (!object.Key) {
        continue;
      }

      const key = object.Key.toLowerCase();

      if (
        key.endsWith(".json") ||
        key.endsWith(".csv") ||
        key.endsWith(".xlsx") ||
        key.endsWith(".xls")
      ) {
        const objectResponse = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: object.Key,
          }),
        );

        const buffer = await streamToBuffer(objectResponse.Body);
        const rows = parseStructuredFile(buffer, object.Key);

        rows.forEach((row) => {
          syncedRecords.push(
            normalizeRecord(row, {
              sourceDataset: req.body.sourceDataset || `s3:${object.Key}`,
              fieldMap: req.body.fieldMap || {},
              defaults: req.body.defaults || {},
              ingestMethod: "s3-sync",
            }),
          );
        });

        continue;
      }

      if (key.endsWith(".jpg") || key.endsWith(".jpeg") || key.endsWith(".png")) {
        const headResponse = await client.send(
          new HeadObjectCommand({
            Bucket: bucket,
            Key: object.Key,
          }),
        );

        const metadata = headResponse.Metadata || {};
        syncedRecords.push(
          normalizeRecord(
            {
              title: metadata.title || object.Key,
              description: metadata.description || "",
              latitude: metadata.latitude ?? req.body.defaults?.latitude,
              longitude: metadata.longitude ?? req.body.defaults?.longitude,
              city: metadata.city || metadata.locationname || req.body.defaults?.city,
              state: metadata.state || req.body.defaults?.state,
              corridor: metadata.corridor || req.body.defaults?.corridor,
              tags: metadata.tags || req.body.defaults?.tags,
              mediaUrl: inferS3ObjectUrl(bucket, region, object.Key),
              mediaType: headResponse.ContentType || "image/jpeg",
              metadata: {
                bucket,
                key: object.Key,
                contentLength: headResponse.ContentLength,
                lastModified: object.LastModified,
              },
              sourceDataset: req.body.sourceDataset || `s3:${prefix || bucket}`,
              externalId: `s3-${bucket}-${object.Key}`,
            },
            {
              sourceDataset: req.body.sourceDataset || `s3:${prefix || bucket}`,
              defaults: req.body.defaults || {},
              ingestMethod: "s3-sync",
            },
          ),
        );
      }
    }

    const saved = await upsertIntelligenceRecords(syncedRecords);

    res.json({
      message: "S3 zone sync completed.",
      pulled: syncedRecords.length,
      stored: saved.length,
    });
  } catch (error) {
    next(error);
  }
};

export const harvestMunicipalSource = async (req, res, next) => {
  try {
    const sources = [];
    const defaults = parseOptionalJson(req.body.defaults, {});

    if (req.file) {
      sources.push({
        fileName: req.file.originalname,
        buffer: req.file.buffer,
        sourceUrl: req.body.sourceUrl || "",
        label: req.body.label || req.file.originalname,
        profileId: req.body.profileId || "",
        crawlLinkedDocuments: req.body.crawlLinkedDocuments !== "false",
        maxLinkedDocuments: Number(req.body.maxLinkedDocuments) || undefined,
      });
    } else if (req.body.rawText || req.body.sourceUrl || req.body.profileId) {
      sources.push({
        rawText: req.body.rawText || "",
        sourceUrl: req.body.sourceUrl || "",
        label: req.body.label || "Manual municipal source",
        profileId: req.body.profileId || "",
        crawlLinkedDocuments: req.body.crawlLinkedDocuments !== "false",
        maxLinkedDocuments: Number(req.body.maxLinkedDocuments) || undefined,
      });
    }

    const result = await harvestMunicipalSources({
      mode: req.body.useDemoPack === "true" || sources.length === 0 ? "demo" : "custom",
      sources,
      defaults,
    });

    res.json({
      message: "Municipal sources harvested successfully.",
      data: result.records,
      summary: result.summary,
    });
  } catch (error) {
    next(error);
  }
};

export const harvestMarketSource = async (req, res, next) => {
  try {
    const defaults = parseOptionalJson(req.body.defaults, {});
    const sources =
      req.body.rawText || req.body.url || req.body.connectorId
        ? [
            {
              id: req.body.id || "custom-market-feed",
              label: req.body.label || "Custom market feed",
              provider: req.body.provider || "Portal snapshot",
              connectorId: req.body.connectorId || "",
              rawText: req.body.rawText || "",
              url: req.body.url || "",
              fileName: req.body.fileName || "",
            },
          ]
        : [];

    if (
      sources.length &&
      sources[0].connectorId &&
      !sources[0].rawText &&
      !sources[0].url
    ) {
      const error = new Error(
        "Provide a portal page URL or raw HTML/JSON input for the selected market connector.",
      );
      error.statusCode = 400;
      throw error;
    }

    const result = await harvestMarketSources({
      mode: req.body.useDemoPack ? "demo" : "custom",
      sources,
      defaults,
    });

    res.json({
      message: "Market sources harvested successfully.",
      data: result.records,
      summary: result.summary,
    });
  } catch (error) {
    next(error);
  }
};

export const runCombinedPipeline = async (req, res, next) => {
  try {
    const result = await runUrbanGrowthPipeline({
      mode: req.body.mode || "demo",
      defaults: parseOptionalJson(req.body.defaults, {}),
      municipalSources: Array.isArray(req.body.municipalSources) ? req.body.municipalSources : [],
      marketSources: Array.isArray(req.body.marketSources) ? req.body.marketSources : [],
    });
    const saved = await upsertIntelligenceRecords(result.records);

    res.json({
      message: "Predictive urban growth pipeline completed.",
      stored: saved.length,
      summary: result.summary,
      preview: saved.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
};
