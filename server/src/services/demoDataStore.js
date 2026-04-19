import seedRecords from "../data/seedRecords.js";
import { enrichZoneRecord } from "./recordEnrichmentService.js";

const average = (values = []) => {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) {
    return 0;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const records = seedRecords.map((record, index) => ({
  ...record,
  ...enrichZoneRecord(record),
  _id: `demo-${index + 1}`,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

const textMatch = (record, search) => {
  if (!search) {
    return true;
  }

  const haystack = [
    record.title,
    record.description,
    record.city,
    record.state,
    record.corridor,
    ...(record.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search.toLowerCase());
};

const applyFilters = (filter = {}) =>
  records.filter((record) => {
    if (filter.city && record.city !== filter.city) {
      return false;
    }

    if (filter.marketPhase && record.marketPhase !== filter.marketPhase) {
      return false;
    }

    if (filter.minScore && record.growthVelocityScore < Number(filter.minScore)) {
      return false;
    }

    if (filter.maxHorizon && record.projectionHorizonMonths > Number(filter.maxHorizon)) {
      return false;
    }

    if (!textMatch(record, filter.search)) {
      return false;
    }

    return true;
  });

const buildSummary = (selected = []) => {
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
    averageGrowthScore: Math.round(average(selected.map((record) => record.growthVelocityScore)) * 10) / 10,
    hotspotCount: selected.filter((record) => record.growthVelocityScore >= 75).length,
    undervaluedCount: selected.filter((record) => record.undervaluationScore >= 60).length,
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

export const demoDataStore = {
  list(filter = {}) {
    return applyFilters(filter)
      .slice()
      .sort((left, right) => {
        if ((filter.sort || "growth") === "upside") {
          return right.projectedAppreciationPct - left.projectedAppreciationPct;
        }

        return (
          right.growthVelocityScore - left.growthVelocityScore ||
          right.opportunityScore - left.opportunityScore
        );
      });
  },

  insertMany(items = []) {
    const inserted = items.map((item, index) => {
      const entry = {
        ...item,
        ...enrichZoneRecord(item),
        _id: `demo-${records.length + index + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return entry;
    });

    records.push(...inserted);
    return inserted;
  },

  upsertMany(items = []) {
    const upserted = [];

    items.forEach((item) => {
      const existingIndex = records.findIndex(
        (record) =>
          item.externalId &&
          item.sourceDataset &&
          record.externalId === item.externalId &&
          record.sourceDataset === item.sourceDataset,
      );

      if (existingIndex >= 0) {
        records[existingIndex] = {
          ...records[existingIndex],
          ...item,
          ...enrichZoneRecord({
            ...records[existingIndex],
            ...item,
          }),
          updatedAt: new Date(),
        };
        upserted.push(records[existingIndex]);
        return;
      }

      const created = {
        ...item,
        ...enrichZoneRecord(item),
        _id: `demo-${records.length + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.push(created);
      upserted.push(created);
    });

    return upserted;
  },

  summary(filter = {}) {
    return buildSummary(applyFilters(filter));
  },
};
