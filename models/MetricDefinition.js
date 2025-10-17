// src/models/MetricDefinition.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

// Defines a custom metric for a program (e.g. "Behavior Score")
const MetricDefinitionSchema = new Schema({
  program: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
  name:    { type: String, required: true },
  // Different data types you can record
  type:    {
    type: String,
    enum: ['number','boolean','text','date'],
    default: 'number'
  }
}, {
  timestamps: true
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Index for finding all metrics for a program
MetricDefinitionSchema.index({ program: 1 });

module.exports = mongoose.model('MetricDefinition', MetricDefinitionSchema);
