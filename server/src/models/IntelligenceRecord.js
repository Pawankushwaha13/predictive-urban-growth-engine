import mongoose from "mongoose";

const municipalSignalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      default: "",
      trim: true,
    },
    impact: {
      type: Number,
      default: 0.6,
    },
    monthsToExecution: {
      type: Number,
      default: 36,
    },
    confidence: {
      type: Number,
      default: 70,
    },
  },
  { _id: false },
);

const sourceTraceSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: "",
      trim: true,
    },
    kind: {
      type: String,
      default: "",
      trim: true,
    },
    provider: {
      type: String,
      default: "",
      trim: true,
    },
    url: {
      type: String,
      default: "",
      trim: true,
    },
    capturedAt: {
      type: String,
      default: "",
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false },
);

const intelligenceRecordSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    corridor: {
      type: String,
      default: "",
      trim: true,
    },
    sourceDataset: {
      type: String,
      default: "manual",
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    sourceLink: {
      type: String,
      default: "",
      trim: true,
    },
    confidence: {
      type: Number,
      default: 60,
      min: 0,
      max: 100,
    },
    tags: {
      type: [String],
      default: [],
    },
    mediaUrl: {
      type: String,
      default: "",
      trim: true,
    },
    mediaType: {
      type: String,
      default: "",
      trim: true,
    },
    pricePerSqft: {
      type: Number,
      default: 0,
    },
    priceGrowthPct: {
      type: Number,
      default: 0,
    },
    rentalYieldPct: {
      type: Number,
      default: 0,
    },
    rentalAbsorptionPct: {
      type: Number,
      default: 0,
    },
    listingDensityScore: {
      type: Number,
      default: 0,
    },
    searchMomentumScore: {
      type: Number,
      default: 0,
    },
    permitMomentumScore: {
      type: Number,
      default: 0,
    },
    cluMomentumScore: {
      type: Number,
      default: 0,
    },
    infrastructureBoostScore: {
      type: Number,
      default: 0,
    },
    supplyRiskScore: {
      type: Number,
      default: 0,
    },
    monthsToCatalyst: {
      type: Number,
      default: 36,
    },
    priceToCityMedianRatio: {
      type: Number,
      default: 1,
    },
    readyToMovePricePerSqft: {
      type: Number,
      default: 0,
    },
    underConstructionPricePerSqft: {
      type: Number,
      default: 0,
    },
    readyToMovePremiumPct: {
      type: Number,
      default: 0,
    },
    underConstructionDiscountPct: {
      type: Number,
      default: 0,
    },
    municipalScore: {
      type: Number,
      default: 0,
    },
    demandScore: {
      type: Number,
      default: 0,
    },
    undervaluationScore: {
      type: Number,
      default: 0,
    },
    riskScore: {
      type: Number,
      default: 0,
    },
    growthVelocityScore: {
      type: Number,
      default: 0,
    },
    opportunityScore: {
      type: Number,
      default: 0,
    },
    projectedAppreciationPct: {
      type: Number,
      default: 0,
    },
    projectionHorizonMonths: {
      type: Number,
      default: 36,
    },
    marketPhase: {
      type: String,
      default: "Watchlist",
      trim: true,
    },
    scoreBand: {
      type: String,
      default: "Watch",
      trim: true,
    },
    heatWeight: {
      type: Number,
      default: 0,
    },
    municipalSignals: {
      type: [municipalSignalSchema],
      default: [],
    },
    sourceTrace: {
      type: [sourceTraceSchema],
      default: [],
    },
    insights: {
      thesis: {
        type: String,
        default: "",
        trim: true,
      },
      drivers: {
        type: [String],
        default: [],
      },
      risks: {
        type: [String],
        default: [],
      },
    },
    aiSummary: {
      headline: {
        type: String,
        default: "",
        trim: true,
      },
      executiveSummary: {
        type: String,
        default: "",
        trim: true,
      },
      recommendation: {
        type: String,
        default: "",
        trim: true,
      },
      sourceDigest: {
        type: String,
        default: "",
        trim: true,
      },
      confidenceLabel: {
        type: String,
        default: "",
        trim: true,
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    externalId: {
      type: String,
      default: "",
      trim: true,
    },
    ingestMethod: {
      type: String,
      default: "manual-upload",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

intelligenceRecordSchema.index({ city: 1, growthVelocityScore: -1 });
intelligenceRecordSchema.index({ latitude: 1, longitude: 1 });
intelligenceRecordSchema.index({ externalId: 1, sourceDataset: 1 });
intelligenceRecordSchema.index({ marketPhase: 1, growthVelocityScore: -1 });
intelligenceRecordSchema.index({ heatWeight: -1 });

const IntelligenceRecord =
  mongoose.models.GrowthZone || mongoose.model("GrowthZone", intelligenceRecordSchema);

export default IntelligenceRecord;
