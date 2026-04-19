const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const average = (values = []) => {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) {
    return 0;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const scale = (value, min, max) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (max === min) {
    return 100;
  }

  return clamp(((value - min) / (max - min)) * 100, 0, 100);
};

const round = (value) => Math.round(value);
const roundToSingleDecimal = (value) => Math.round(value * 10) / 10;

const signalCategoryWeights = {
  metro: 1,
  transit: 0.96,
  expressway: 0.92,
  road: 0.88,
  utility: 0.74,
  zoning: 0.82,
  clu: 0.82,
  business: 0.86,
  social: 0.64,
};

const signalStatusWeights = {
  announced: 0.68,
  approved: 0.76,
  tendered: 0.88,
  "under-construction": 1,
  operational: 0.94,
};

const scoreMunicipalSignals = (signals = []) => {
  if (!signals.length) {
    return 0;
  }

  return average(
    signals.map((signal) => {
      const categoryWeight =
        signalCategoryWeights[String(signal.category || "").toLowerCase()] || 0.72;
      const statusWeight =
        signalStatusWeights[String(signal.status || "").toLowerCase()] || 0.7;
      const impactWeight = clamp(Number(signal.impact) || 0.75, 0.2, 1.2);
      const confidenceWeight = clamp((Number(signal.confidence) || 70) / 100, 0.45, 1);
      const monthsToExecution = Number(signal.monthsToExecution) || 36;
      const timingWeight =
        monthsToExecution <= 12
          ? 1
          : monthsToExecution <= 24
            ? 0.92
            : monthsToExecution <= 36
              ? 0.82
              : monthsToExecution <= 60
                ? 0.68
                : 0.55;

      return 100 * categoryWeight * statusWeight * impactWeight * confidenceWeight * timingWeight;
    }),
  );
};

const deriveReadyToMovePremiumPct = (zone) => {
  if (Number.isFinite(zone.readyToMovePremiumPct)) {
    return clamp(zone.readyToMovePremiumPct, 0, 100);
  }

  const readyPrice = zone.readyToMovePricePerSqft;
  const underConstructionPrice = zone.underConstructionPricePerSqft;

  if (!Number.isFinite(readyPrice) || !Number.isFinite(underConstructionPrice) || !underConstructionPrice) {
    return 0;
  }

  return clamp(((readyPrice - underConstructionPrice) / underConstructionPrice) * 100, 0, 100);
};

const deriveUnderConstructionDiscountPct = (zone) => {
  if (Number.isFinite(zone.underConstructionDiscountPct)) {
    return clamp(zone.underConstructionDiscountPct, 0, 100);
  }

  const readyPrice = zone.readyToMovePricePerSqft;
  const underConstructionPrice = zone.underConstructionPricePerSqft;

  if (!Number.isFinite(readyPrice) || !Number.isFinite(underConstructionPrice) || !readyPrice) {
    return 0;
  }

  return clamp(((readyPrice - underConstructionPrice) / readyPrice) * 100, 0, 100);
};

const buildDrivers = ({
  title,
  city,
  municipalScore,
  demandScore,
  undervaluationScore,
  rentalAbsorptionPct,
  searchMomentumScore,
  underConstructionDiscountPct,
  municipalSignals,
  projectionHorizonMonths,
}) => {
  const candidates = [
    {
      weight: municipalScore,
      text:
        municipalSignals.length > 0
          ? `${municipalSignals.length} municipal catalysts are already in the pipeline for ${title}.`
          : `${title} is positioned to benefit from near-term public capex momentum.`,
    },
    {
      weight: demandScore,
      text: `Demand signals in ${city} are running ahead of supply saturation for this zone.`,
    },
    {
      weight: rentalAbsorptionPct,
      text: "Rental absorption suggests end-user pull is already visible on the ground.",
    },
    {
      weight: searchMomentumScore,
      text: "Search momentum is elevated, indicating rising buyer attention before price catch-up.",
    },
    {
      weight: undervaluationScore,
      text: "Current pricing still leaves room for value capture before the next development cycle.",
    },
    {
      weight: underConstructionDiscountPct,
      text: "Under-construction inventory still trades at a meaningful discount to ready stock.",
    },
    {
      weight: 100 - projectionHorizonMonths,
      text: "The payoff window is close enough to support a realistic 24-to-36 month investment thesis.",
    },
  ];

  return candidates
    .sort((left, right) => right.weight - left.weight)
    .map((candidate) => candidate.text)
    .filter((text, index, collection) => collection.indexOf(text) === index)
    .slice(0, 3);
};

const buildRisks = ({
  city,
  listingDensityScore,
  supplyRiskScore,
  priceGrowthPct,
  monthsToCatalyst,
  priceToCityMedianRatio,
}) => {
  const candidates = [
    {
      weight: supplyRiskScore,
      text: "Future launches could compress pricing if developers flood the corridor too quickly.",
    },
    {
      weight: scale(listingDensityScore, 68, 95),
      text: `Competition intensity is already building across ${city}, which can soften short-term margins.`,
    },
    {
      weight: scale(priceGrowthPct, 16, 24),
      text: "Recent appreciation is strong enough that entry timing still matters.",
    },
    {
      weight: scale(monthsToCatalyst, 28, 60),
      text: "Some of the municipal upside is dependent on projects that still need time to land.",
    },
    {
      weight: scale(priceToCityMedianRatio, 1, 1.25),
      text: "Relative pricing is no longer deeply discounted versus the city median.",
    },
  ];

  return candidates
    .sort((left, right) => right.weight - left.weight)
    .filter((candidate) => candidate.weight >= 35)
    .map((candidate) => candidate.text)
    .slice(0, 3);
};

const determineMarketPhase = ({ growthVelocityScore, municipalScore, demandScore, riskScore }) => {
  if (growthVelocityScore >= 75 && riskScore < 55) {
    return "Prime Acceleration";
  }

  if (municipalScore >= 72 && growthVelocityScore >= 66) {
    return "Value Unlock";
  }

  if (demandScore >= 64 && growthVelocityScore >= 58) {
    return "Emerging Corridor";
  }

  if (riskScore >= 70) {
    return "Speculative";
  }

  return "Watchlist";
};

const determineScoreBand = (growthVelocityScore) => {
  if (growthVelocityScore >= 80) {
    return "Hotspot";
  }

  if (growthVelocityScore >= 65) {
    return "Growth Track";
  }

  if (growthVelocityScore >= 50) {
    return "Watch";
  }

  return "Caution";
};

const determineProjectionHorizon = ({ growthVelocityScore, monthsToCatalyst, municipalScore }) => {
  if (growthVelocityScore >= 80 && monthsToCatalyst <= 24) {
    return 24;
  }

  if (growthVelocityScore >= 68 || municipalScore >= 72 || monthsToCatalyst <= 30) {
    return 36;
  }

  if (growthVelocityScore >= 56) {
    return 48;
  }

  return 60;
};

export const scoreGrowthZone = (zone) => {
  const municipalSignals = Array.isArray(zone.municipalSignals) ? zone.municipalSignals : [];
  const readyToMovePremiumPct = roundToSingleDecimal(deriveReadyToMovePremiumPct(zone));
  const underConstructionDiscountPct = roundToSingleDecimal(
    deriveUnderConstructionDiscountPct(zone),
  );

  const municipalPipelineScore = scoreMunicipalSignals(municipalSignals);
  const priceMomentumScore = scale(zone.priceGrowthPct, 5, 20);
  const yieldScore = scale(zone.rentalYieldPct, 2.5, 5.5);
  const affordabilityScore = scale(1.18 - zone.priceToCityMedianRatio, 0, 0.55);
  const listingActivityScore = clamp(100 - Math.abs(zone.listingDensityScore - 60) * 2.1, 0, 100);
  const listingCrowdingRisk = scale(zone.listingDensityScore, 70, 95);
  const priceOverheatRisk = scale(zone.priceGrowthPct, 17, 25);
  const timelineRisk = scale(zone.monthsToCatalyst, 24, 60);
  const readyPremiumScore = scale(readyToMovePremiumPct, 4, 20);
  const ucDiscountScore = scale(underConstructionDiscountPct, 4, 18);

  const municipalScore = round(
    municipalPipelineScore * 0.52 +
      zone.permitMomentumScore * 0.16 +
      zone.cluMomentumScore * 0.12 +
      zone.infrastructureBoostScore * 0.2,
  );

  const demandScore = round(
    zone.searchMomentumScore * 0.28 +
      zone.rentalAbsorptionPct * 0.24 +
      priceMomentumScore * 0.18 +
      listingActivityScore * 0.15 +
      readyPremiumScore * 0.15,
  );

  const undervaluationScore = round(
    ucDiscountScore * 0.34 +
      yieldScore * 0.28 +
      affordabilityScore * 0.24 +
      readyPremiumScore * 0.14,
  );

  const riskScore = round(
    zone.supplyRiskScore * 0.42 +
      listingCrowdingRisk * 0.22 +
      timelineRisk * 0.2 +
      priceOverheatRisk * 0.16,
  );

  const growthVelocityScore = clamp(
    round(municipalScore * 0.44 + demandScore * 0.31 + undervaluationScore * 0.21 - riskScore * 0.15 + 15),
    0,
    100,
  );

  const opportunityScore = clamp(
    round(growthVelocityScore * 0.6 + undervaluationScore * 0.35 - riskScore * 0.05),
    0,
    100,
  );

  const projectionHorizonMonths = determineProjectionHorizon({
    growthVelocityScore,
    monthsToCatalyst: zone.monthsToCatalyst,
    municipalScore,
  });

  const projectedAppreciationPct = roundToSingleDecimal(
    clamp(
      8 + municipalScore * 0.07 + demandScore * 0.06 + undervaluationScore * 0.05 - riskScore * 0.04,
      6,
      32,
    ),
  );

  const confidence = round(
    average(municipalSignals.map((signal) => Number(signal.confidence) || 70)) * 0.55 +
      average([
        zone.listingDensityScore,
        zone.searchMomentumScore,
        zone.rentalAbsorptionPct,
        zone.permitMomentumScore,
      ]) *
        0.25 +
      20,
  );

  const marketPhase = determineMarketPhase({
    growthVelocityScore,
    municipalScore,
    demandScore,
    riskScore,
  });
  const scoreBand = determineScoreBand(growthVelocityScore);

  const drivers = buildDrivers({
    title: zone.title,
    city: zone.city,
    municipalScore,
    demandScore,
    undervaluationScore,
    rentalAbsorptionPct: zone.rentalAbsorptionPct,
    searchMomentumScore: zone.searchMomentumScore,
    underConstructionDiscountPct,
    municipalSignals,
    projectionHorizonMonths,
  });

  const risks = buildRisks({
    city: zone.city,
    listingDensityScore: zone.listingDensityScore,
    supplyRiskScore: zone.supplyRiskScore,
    priceGrowthPct: zone.priceGrowthPct,
    monthsToCatalyst: zone.monthsToCatalyst,
    priceToCityMedianRatio: zone.priceToCityMedianRatio,
  });

  const thesis = `${zone.title} scores ${growthVelocityScore}/100 because municipal intent and live demand signals are converging while pricing still offers ${round(
    underConstructionDiscountPct,
  )}% headroom versus ready inventory.`;

  return {
    readyToMovePremiumPct,
    underConstructionDiscountPct,
    municipalScore,
    demandScore,
    undervaluationScore,
    riskScore,
    growthVelocityScore,
    opportunityScore,
    projectedAppreciationPct,
    projectionHorizonMonths,
    marketPhase,
    scoreBand,
    confidence: clamp(confidence, 35, 96),
    insights: {
      thesis,
      drivers,
      risks,
    },
  };
};
