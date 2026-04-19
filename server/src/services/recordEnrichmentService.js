import { buildAiSummary } from "./aiNarrativeService.js";
import { scoreGrowthZone } from "./growthScoreEngine.js";

export const enrichZoneRecord = (record = {}) => {
  const scoredRecord = {
    ...record,
    ...scoreGrowthZone(record),
  };

  const heatWeight = Math.max(
    8,
    Math.round(
      (scoredRecord.growthVelocityScore || 0) * 0.7 +
        (scoredRecord.projectedAppreciationPct || 0) * 1.6,
    ),
  );

  return {
    ...scoredRecord,
    heatWeight,
    aiSummary: buildAiSummary({
      ...scoredRecord,
      heatWeight,
      sourceTrace: Array.isArray(record.sourceTrace) ? record.sourceTrace : [],
    }),
    sourceTrace: Array.isArray(record.sourceTrace) ? record.sourceTrace : [],
  };
};
