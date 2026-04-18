import mongoose from "mongoose";

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
    sourceType: {
      type: String,
      enum: ["OSINT", "HUMINT", "IMINT"],
      required: true,
    },
    sourceDataset: {
      type: String,
      default: "manual",
      trim: true,
    },
    locationName: {
      type: String,
      default: "",
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
    eventTime: {
      type: Date,
      default: Date.now,
    },
    sourceLink: {
      type: String,
      default: "",
      trim: true,
    },
    confidence: {
      type: Number,
      default: 50,
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

intelligenceRecordSchema.index({ sourceType: 1, eventTime: -1 });
intelligenceRecordSchema.index({ latitude: 1, longitude: 1 });
intelligenceRecordSchema.index({ externalId: 1, sourceDataset: 1 });

const IntelligenceRecord = mongoose.model(
  "IntelligenceRecord",
  intelligenceRecordSchema,
);

export default IntelligenceRecord;

