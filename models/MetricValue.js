// src/models/MetricValue.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const MetricValueSchema = new Schema({
  program:    { type: Schema.Types.ObjectId, ref: 'Program', required: true },
  definition: { type: Schema.Types.ObjectId, ref: 'MetricDefinition', required: true },
  member:     { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  date:       { type: String, required: true },          // YYYY-MM-DD
  // store a value of any type
  value:      { type: Schema.Types.Mixed, required: true }
}, {
  timestamps: true
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Compound index for program metric queries
MetricValueSchema.index({ program: 1, date: -1 });
// Index for member metric history
MetricValueSchema.index({ member: 1, date: -1 });
// Index for finding values by definition
MetricValueSchema.index({ definition: 1, date: -1 });
// Unique constraint: one value per program+definition+member+date
MetricValueSchema.index(
  { program: 1, definition: 1, member: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model('MetricValue', MetricValueSchema);
