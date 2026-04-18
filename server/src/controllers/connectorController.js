import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { MongoClient } from "mongodb";

import { upsertIntelligenceRecords } from "../repositories/intelligenceRepository.js";
import { normalizeRecord } from "../utils/normalizeRecord.js";
import { parseStructuredFile } from "../utils/parseStructuredFile.js";
import { streamToBuffer } from "../utils/streamHelpers.js";

const inferS3ObjectUrl = (bucket, region, key) =>
  `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, "/")}`;

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
        defaultSourceType: req.body.defaultSourceType || "OSINT",
        fieldMap: req.body.fieldMap || {},
        defaults: req.body.defaults || {},
        ingestMethod: "mongo-sync",
      }),
    );

    const synced = await upsertIntelligenceRecords(records);

    res.json({
      message: "MongoDB intelligence sync completed.",
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
              defaultSourceType: req.body.defaultSourceType || "OSINT",
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
              locationName: metadata.locationname || req.body.defaults?.locationName,
              confidence: metadata.confidence ?? req.body.defaults?.confidence,
              tags: metadata.tags || req.body.defaults?.tags,
              mediaUrl: inferS3ObjectUrl(bucket, region, object.Key),
              mediaType: headResponse.ContentType || "image/jpeg",
              metadata: {
                bucket,
                key: object.Key,
                contentLength: headResponse.ContentLength,
                lastModified: object.LastModified,
              },
              sourceType: "IMINT",
              sourceDataset: req.body.sourceDataset || `s3:${prefix || bucket}`,
              externalId: `s3-${bucket}-${object.Key}`,
            },
            {
              sourceDataset: req.body.sourceDataset || `s3:${prefix || bucket}`,
              defaultSourceType: "IMINT",
              defaults: req.body.defaults || {},
              ingestMethod: "s3-sync",
            },
          ),
        );
      }
    }

    const saved = await upsertIntelligenceRecords(syncedRecords);

    res.json({
      message: "S3 intelligence sync completed.",
      pulled: syncedRecords.length,
      stored: saved.length,
    });
  } catch (error) {
    next(error);
  }
};

