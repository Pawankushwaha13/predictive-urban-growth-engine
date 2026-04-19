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
    const fieldMap = req.body.fieldMap ? JSON.parse(req.body.fieldMap) : {};
    const defaults = req.body.defaults ? JSON.parse(req.body.defaults) : {};

    const normalizedRows = rows.map((row) =>
      normalizeRecord(row, {
        sourceDataset,
        defaults,
        fieldMap,
        ingestMethod: "manual-upload",
      }),
    );

    const created = await insertManyIntelligenceRecords(normalizedRows);

    res.status(201).json({
      message: "Urban growth dataset ingested successfully.",
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
      city: req.body.city || req.body.locationName,
      state: req.body.state,
      corridor: req.body.corridor,
      description: req.body.description,
      pricePerSqft: req.body.pricePerSqft,
      priceGrowthPct: req.body.priceGrowthPct,
      rentalYieldPct: req.body.rentalYieldPct,
      rentalAbsorptionPct: req.body.rentalAbsorptionPct,
      listingDensityScore: req.body.listingDensityScore,
      searchMomentumScore: req.body.searchMomentumScore,
      permitMomentumScore: req.body.permitMomentumScore,
      cluMomentumScore: req.body.cluMomentumScore,
      infrastructureBoostScore: req.body.infrastructureBoostScore,
      supplyRiskScore: req.body.supplyRiskScore,
      monthsToCatalyst: req.body.monthsToCatalyst,
      priceToCityMedianRatio: req.body.priceToCityMedianRatio,
      readyToMovePricePerSqft: req.body.readyToMovePricePerSqft,
      underConstructionPricePerSqft: req.body.underConstructionPricePerSqft,
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
            city: fileMetadata.city || commonDefaults.city,
            state: fileMetadata.state || commonDefaults.state,
            corridor: fileMetadata.corridor || commonDefaults.corridor,
            pricePerSqft: fileMetadata.pricePerSqft ?? commonDefaults.pricePerSqft,
            priceGrowthPct: fileMetadata.priceGrowthPct ?? commonDefaults.priceGrowthPct,
            rentalYieldPct: fileMetadata.rentalYieldPct ?? commonDefaults.rentalYieldPct,
            rentalAbsorptionPct:
              fileMetadata.rentalAbsorptionPct ?? commonDefaults.rentalAbsorptionPct,
            listingDensityScore:
              fileMetadata.listingDensityScore ?? commonDefaults.listingDensityScore,
            searchMomentumScore:
              fileMetadata.searchMomentumScore ?? commonDefaults.searchMomentumScore,
            permitMomentumScore:
              fileMetadata.permitMomentumScore ?? commonDefaults.permitMomentumScore,
            cluMomentumScore: fileMetadata.cluMomentumScore ?? commonDefaults.cluMomentumScore,
            infrastructureBoostScore:
              fileMetadata.infrastructureBoostScore ?? commonDefaults.infrastructureBoostScore,
            supplyRiskScore: fileMetadata.supplyRiskScore ?? commonDefaults.supplyRiskScore,
            monthsToCatalyst: fileMetadata.monthsToCatalyst ?? commonDefaults.monthsToCatalyst,
            priceToCityMedianRatio:
              fileMetadata.priceToCityMedianRatio ?? commonDefaults.priceToCityMedianRatio,
            readyToMovePricePerSqft:
              fileMetadata.readyToMovePricePerSqft ?? commonDefaults.readyToMovePricePerSqft,
            underConstructionPricePerSqft:
              fileMetadata.underConstructionPricePerSqft ??
              commonDefaults.underConstructionPricePerSqft,
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
            sourceDataset: fileMetadata.sourceDataset || commonDefaults.sourceDataset,
            externalId: `${storedAsset.storedFileName}-${Date.now()}`,
          },
          {
            sourceDataset: fileMetadata.sourceDataset || commonDefaults.sourceDataset,
            ingestMethod: "image-upload",
          },
        );
      }),
    );

    const saved = await upsertIntelligenceRecords(records);

    res.status(201).json({
      message: "Zone support imagery uploaded successfully.",
      count: saved.length,
      preview: records.slice(0, 3),
    });
  } catch (error) {
    next(error);
  }
};
