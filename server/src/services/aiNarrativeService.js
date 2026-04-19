const getConfidenceLabel = (confidence = 0) => {
  if (confidence >= 82) {
    return "High confidence";
  }

  if (confidence >= 68) {
    return "Moderate confidence";
  }

  return "Exploratory confidence";
};

export const buildAiSummary = (record = {}) => {
  const evidenceCount =
    (record.sourceTrace?.length || 0) + (record.municipalSignals?.length || 0);
  const leadingSignal =
    record.municipalScore >= record.demandScore ? "municipal intent" : "market demand";
  const recommendation =
    record.growthVelocityScore >= 75
      ? "Prioritize land watch and builder partnership conversations."
      : record.growthVelocityScore >= 65
        ? "Keep this micro-market in active diligence with monthly monitoring."
        : "Track the corridor, but wait for stronger demand confirmation.";

  return {
    headline: `${record.title} looks ${record.marketPhase || "watchlist-ready"} for a ${record.projectionHorizonMonths || 36}-month investment horizon.`,
    executiveSummary: `${record.title} in ${record.city} is being driven primarily by ${leadingSignal}, with an estimated ${record.projectedAppreciationPct || 0}% upside and ${record.growthVelocityScore || 0}/100 growth velocity.`,
    recommendation,
    sourceDigest:
      evidenceCount > 0
        ? `${evidenceCount} evidence points contributed to this zone score, including harvested municipal signals and market feed snapshots.`
        : "This score is currently based on uploaded or seeded structured data.",
    confidenceLabel: getConfidenceLabel(record.confidence),
  };
};
