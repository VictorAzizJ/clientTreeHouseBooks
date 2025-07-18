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

module.exports = mongoose.model('MetricValue', MetricValueSchema);
