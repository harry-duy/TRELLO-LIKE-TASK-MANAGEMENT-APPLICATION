const mongoose = require('mongoose');

const aiUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    feature: {
      type: String,
      enum: ['ai_search', 'auto_checklist', 'assistant_chat'],
      required: true,
    },
    query: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['success', 'fallback', 'error'],
      default: 'success',
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    promptTokens: {
      type: Number,
      default: 0,
    },
    completionTokens: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

aiUsageSchema.index({ user: 1, createdAt: -1 });
aiUsageSchema.index({ feature: 1, createdAt: -1 });
aiUsageSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('AIUsage', aiUsageSchema);
