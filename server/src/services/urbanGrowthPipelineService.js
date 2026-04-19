import { enrichZoneRecord } from "./recordEnrichmentService.js";
import { harvestMarketSources } from "./marketHarvester.js";
import { harvestMunicipalSources } from "./municipalHarvester.js";
import { buildZoneKey, resolveZoneReference } from "./zoneReferenceService.js";

const mergeRecordPair = (baseRecord, patchRecord, sourceDataset) => {
  const mergedSourceTrace = [
    ...(baseRecord.sourceTrace || []),
    ...(patchRecord.sourceTrace || []),
  ];
  const mergedMunicipalSignals = [
    ...(baseRecord.municipalSignals || []),
    ...(patchRecord.municipalSignals || []),
  ];

  return {
    ...baseRecord,
    ...patchRecord,
    metadata: {
      ...(baseRecord.metadata || {}),
      ...(patchRecord.metadata || {}),
    },
    municipalSignals: mergedMunicipalSignals,
    sourceTrace: mergedSourceTrace,
    sourceDataset,
    ingestMethod: "pipeline-harvest",
  };
};

export const runUrbanGrowthPipeline = async (payload = {}) => {
  const sourceDataset = payload.mode === "demo" ? "demo-seed" : "predictive-pipeline";
  const municipalResult = await harvestMunicipalSources({
    mode: payload.mode || "demo",
    sources: payload.municipalSources || [],
    defaults: payload.defaults || {},
  });

  const marketResult = await harvestMarketSources({
    mode: payload.mode || "demo",
    sources: payload.marketSources || [],
    defaults: payload.defaults || {},
  });

  const zoneMap = new Map();

  [...marketResult.records, ...municipalResult.records].forEach((record) => {
    const reference =
      resolveZoneReference({
        title: record.title,
        city: record.city,
        corridor: record.corridor,
        externalId: record.externalId,
      }) || {};
    const mergedRecord = {
      ...reference,
      ...record,
      sourceDataset,
      externalId: record.externalId || reference.externalId || buildZoneKey(record),
    };
    const zoneKey = mergedRecord.externalId;
    const existingRecord = zoneMap.get(zoneKey);
    zoneMap.set(
      zoneKey,
      existingRecord ? mergeRecordPair(existingRecord, mergedRecord, sourceDataset) : mergedRecord,
    );
  });

  const records = Array.from(zoneMap.values()).map((record) => enrichZoneRecord(record));

  return {
    records,
    summary: {
      municipalSourceCount: municipalResult.summary.sourceCount,
      marketSourceCount: marketResult.summary.sourceCount,
      extractedSignalCount: municipalResult.summary.extractedSignalCount,
      marketSnapshotCount: marketResult.summary.rowCount,
      zoneCount: records.length,
    },
  };
};
