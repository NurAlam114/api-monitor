const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    apiName: { type: String, required: true, index: true, trim: true },
    anomalyType: {
      type: String,
      required: true,
      enum: ['HIGH_LATENCY', 'SERVER_ERROR', 'CLIENT_ERROR', 'NO_DATA', 'INVALID_RESPONSE'],
    },
    severity: {
      type: String,
      required: true,
      enum: ['critical', 'high', 'medium'],
      index: true,
    },
    message: { type: String, required: true },
    aiGenerated: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'resolved'], default: 'active', index: true },
    rawData: { type: mongoose.Schema.Types.Mixed },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ apiName: 1, anomalyType: 1, status: 1 });

module.exports = mongoose.model('Alert', alertSchema);
