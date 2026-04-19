import { databaseState } from "../config/db.js";
import seedRecords from "../data/seedRecords.js";
import {
  listIntelligenceRecords,
  summarizeIntelligence,
  upsertIntelligenceRecords,
} from "../repositories/intelligenceRepository.js";

export const getIntelligenceRecords = async (req, res, next) => {
  try {
    const { city, marketPhase, search, minScore, maxHorizon, sort } = req.query;

    const records = await listIntelligenceRecords({
      city,
      marketPhase,
      search,
      minScore,
      maxHorizon,
      sort,
    });

    res.json({
      data: records,
      meta: {
        count: records.length,
        storageMode: databaseState.connected ? "mongodb" : "demo-fallback",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getIntelligenceSummary = async (req, res, next) => {
  try {
    const summary = await summarizeIntelligence({});

    res.json({
      data: summary,
      meta: {
        storageMode: databaseState.connected ? "mongodb" : "demo-fallback",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const seedIntelligenceRecords = async (_req, res, next) => {
  try {
    const records = await upsertIntelligenceRecords(seedRecords);

    res.status(201).json({
      message: "Predictive urban growth demo zones loaded successfully.",
      count: records.length,
    });
  } catch (error) {
    next(error);
  }
};
