import path from "path";

import {
  insertManyIntelligenceRecords,
  upsertIntelligenceRecords,
} from "../repositories/intelligenceRepository.js";
import { persistUploadedImage } from "../services/mediaStorage.js";
import { normalizeRecord } from "../utils/normalizeRecord.js";
import { parseStructuredFile } from "../utils/parseStructuredFile.js";

const parseMetadataText = (metadataText) => {
  if (!metadataText) {
    return {};
  }

  const parsed = JSON.parse(metadataText);
  return typeof parsed === "object" && parsed !== null ? parsed : {};
};

export const ingestStructuredFile = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Upload a CSV, Excel, or JSON file.");
      error.statusCode = 400;
      throw error;
    }

    const rows = parseStructuredFile(req.file.buffer, req.file.originalname);
    const sourceDataset = req.body.sourceDataset || req.file.originalname;
    const defaultSourceType = req.body.defaultSourceType || "HUMINT";
    const fieldMap = req.body.fieldMap ? JSON.parse(req.body.fieldMap) : {};
    const defaults = req.body.defaults ? JSON.parse(req.body.defaults) : {};

    const normalizedRows = rows.map((row) =>
      normalizeRecord(row, {
        sourceDataset,
        defaultSourceType,
        defaults,
        fieldMap,
        ingestMethod: "manual-upload",
      }),
    );

    const created = await insertManyIntelligenceRecords(normalizedRows);

    res.status(201).json({
      message: "Structured intelligence file ingested successfully.",
      count: created.length,
      preview: created.slice(0, 3),
    });
  } catch (error) {
    next(error);
  }
};

export const ingestImageFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      const error = new Error("Upload one or more image files.");
      error.statusCode = 400;
      throw error;
    }

    const metadataByFile = parseMetadataText(req.body.metadata);
    const commonDefaults = {
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      locationName: req.body.locationName,
      description: req.body.description,
      confidence: req.body.confidence,
      tags: req.body.tags,
      sourceDataset: req.body.sourceDataset || "manual-imagery-upload",
    };

    const records = await Promise.all(
      req.files.map(async (file, index) => {
        const fileMetadata = metadataByFile[file.originalname] || {};
        const fileTitle = fileMetadata.title
          ? fileMetadata.title
          : req.body.titlePrefix
            ? `${req.body.titlePrefix} ${index + 1}`
            : path.parse(file.originalname).name;
        const storedAsset = await persistUploadedImage(file);

        return normalizeRecord(
          {
            title: fileTitle,
            description: fileMetadata.description || commonDefaults.description,
            latitude: fileMetadata.latitude ?? commonDefaults.latitude,
            longitude: fileMetadata.longitude ?? commonDefaults.longitude,
            locationName: fileMetadata.locationName || commonDefaults.locationName,
            confidence: fileMetadata.confidence ?? commonDefaults.confidence,
            tags: fileMetadata.tags || commonDefaults.tags,
            metadata: {
              fileName: file.originalname,
              storedFileName: storedAsset.storedFileName,
              size: file.size,
              ...storedAsset.metadata,
              ...fileMetadata.metadata,
            },
            mediaUrl: storedAsset.mediaUrl,
            mediaType: storedAsset.mediaType,
            sourceType: "IMINT",
            sourceDataset: fileMetadata.sourceDataset || commonDefaults.sourceDataset,
            externalId: `${storedAsset.storedFileName}-${Date.now()}`,
          },
          {
            sourceDataset: fileMetadata.sourceDataset || commonDefaults.sourceDataset,
            defaultSourceType: "IMINT",
            ingestMethod: "image-upload",
          },
        );
      }),
    );

    const saved = await upsertIntelligenceRecords(records);

    res.status(201).json({
      message: "Imagery uploaded and indexed successfully.",
      count: saved.length,
      preview: records.slice(0, 3),
    });
  } catch (error) {
    next(error);
  }
};
