import IntelligenceRecord from "../models/IntelligenceRecord.js";
import { databaseState } from "../config/db.js";
import { demoDataStore } from "../services/demoDataStore.js";
import { enrichZoneRecord } from "../services/recordEnrichmentService.js";

const buildFilter = ({ city, marketPhase, search, minScore, maxHorizon }) => {
  const filter = {};

  if (city) {
    filter.city = city;
  }

  if (marketPhase) {
    filter.marketPhase = marketPhase;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
      { corridor: { $regex: search, $options: "i" } },
      { tags: { $elemMatch: { $regex: search, $options: "i" } } },
    ];
  }

  if (minScore) {
    filter.growthVelocityScore = { $gte: Number(minScore) };
  }

  if (maxHorizon) {
    filter.projectionHorizonMonths = { $lte: Number(maxHorizon) };
  }

  return filter;
};

const summarizeRecords = (selected = []) => {
  const cityLeaderboard = Object.entries(
    selected.reduce((accumulator, record) => {
      const key = record.city || "Unknown";
      const bucket = accumulator[key] || {
        city: key,
        count: 0,
        totalScore: 0,
      };
      bucket.count += 1;
      bucket.totalScore += record.growthVelocityScore || 0;
      accumulator[key] = bucket;
      return accumulator;
    }, {}),
  )
    .map(([, value]) => ({
      city: value.city,
      zoneCount: value.count,
      averageGrowthScore: Math.round((value.totalScore / value.count) * 10) / 10,
    }))
    .sort((left, right) => right.averageGrowthScore - left.averageGrowthScore);

  return {
    totalZones: selected.length,
    averageGrowthScore: Math.round(
      (selected.reduce((sum, record) => sum + (record.growthVelocityScore || 0), 0) /
        Math.max(selected.length, 1)) *
        10,
    ) / 10,
    hotspotCount: selected.filter((record) => (record.growthVelocityScore || 0) >= 75).length,
    undervaluedCount: selected.filter((record) => (record.undervaluationScore || 0) >= 60).length,
    strongestCity: cityLeaderboard[0] || null,
    maxProjectedAppreciationPct: Math.max(
      0,
      ...selected.map((record) => record.projectedAppreciationPct || 0),
    ),
    activeMunicipalSignals: selected.reduce(
      (sum, record) => sum + (record.municipalSignals?.length || 0),
      0,
    ),
    cityLeaderboard: cityLeaderboard.slice(0, 5),
    lastUpdatedAt:
      selected.length > 0
        ? selected
            .map((record) => new Date(record.updatedAt || record.createdAt))
            .sort((a, b) => b - a)[0]
            .toISOString()
        : null,
  };
};

export const listIntelligenceRecords = async (options = {}) => {
  if (!databaseState.connected) {
    return demoDataStore.list(options);
  }

  return IntelligenceRecord.find(buildFilter(options))
    .sort(
      options.sort === "upside"
        ? { projectedAppreciationPct: -1, growthVelocityScore: -1 }
        : { growthVelocityScore: -1, opportunityScore: -1, createdAt: -1 },
    )
    .lean();
};

export const insertManyIntelligenceRecords = async (records) => {
  const enrichedRecords = records.map((record) => enrichZoneRecord(record));

  if (!databaseState.connected) {
    return demoDataStore.insertMany(enrichedRecords);
  }

  return IntelligenceRecord.insertMany(enrichedRecords, { ordered: false });
};

export const upsertIntelligenceRecords = async (records) => {
  const enrichedRecords = records.map((record) => enrichZoneRecord(record));

  if (!databaseState.connected) {
    return demoDataStore.upsertMany(enrichedRecords);
  }

  if (!enrichedRecords.length) {
    return [];
  }

  const bulkOperations = enrichedRecords.map((record) => {
    const hasNaturalKey = Boolean(record.externalId && record.sourceDataset);

    if (!hasNaturalKey) {
      return {
        insertOne: {
          document: record,
        },
      };
    }

    return {
      updateOne: {
        filter: {
          externalId: record.externalId,
          sourceDataset: record.sourceDataset,
        },
        update: {
          $set: record,
        },
        upsert: true,
      },
    };
  });

  await IntelligenceRecord.bulkWrite(bulkOperations, { ordered: false });

  return enrichedRecords;
};

export const summarizeIntelligence = async (options = {}) => {
  if (!databaseState.connected) {
    return demoDataStore.summary(options);
  }

  const selected = await IntelligenceRecord.find(buildFilter(options))
    .select(
      [
        "city",
        "growthVelocityScore",
        "undervaluationScore",
        "projectedAppreciationPct",
        "municipalSignals",
        "updatedAt",
        "createdAt",
      ].join(" "),
    )
    .lean();

  return summarizeRecords(selected);
};
