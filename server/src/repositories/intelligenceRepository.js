import IntelligenceRecord from "../models/IntelligenceRecord.js";
import { databaseState } from "../config/db.js";
import { demoDataStore } from "../services/demoDataStore.js";

const buildFilter = ({ sourceType, search, hasMedia }) => {
  const filter = {};

  if (sourceType) {
    filter.sourceType = sourceType;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { locationName: { $regex: search, $options: "i" } },
      { tags: { $elemMatch: { $regex: search, $options: "i" } } },
    ];
  }

  if (hasMedia === true) {
    filter.mediaUrl = { $exists: true, $ne: "" };
  }

  return filter;
};

export const listIntelligenceRecords = async (options = {}) => {
  if (!databaseState.connected) {
    return demoDataStore.list(options);
  }

  return IntelligenceRecord.find(buildFilter(options))
    .sort({ eventTime: -1, createdAt: -1 })
    .lean();
};

export const insertManyIntelligenceRecords = async (records) => {
  if (!databaseState.connected) {
    return demoDataStore.insertMany(records);
  }

  return IntelligenceRecord.insertMany(records, { ordered: false });
};

export const upsertIntelligenceRecords = async (records) => {
  if (!databaseState.connected) {
    return demoDataStore.upsertMany(records);
  }

  if (!records.length) {
    return [];
  }

  const bulkOperations = records.map((record) => {
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

  return records;
};

export const summarizeIntelligence = async (options = {}) => {
  if (!databaseState.connected) {
    return demoDataStore.summary(options);
  }

  const selected = await IntelligenceRecord.find(buildFilter(options))
    .select("sourceType mediaUrl eventTime")
    .lean();

  const latestEventTime =
    selected.length > 0
      ? selected
          .map((record) => new Date(record.eventTime))
          .sort((a, b) => b - a)[0]
          .toISOString()
      : null;

  return {
    total: selected.length,
    OSINT: selected.filter((record) => record.sourceType === "OSINT").length,
    HUMINT: selected.filter((record) => record.sourceType === "HUMINT").length,
    IMINT: selected.filter((record) => record.sourceType === "IMINT").length,
    withMedia: selected.filter((record) => Boolean(record.mediaUrl)).length,
    latestEventTime,
  };
};
