const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

// Defines a custom metric for a program (e.g. “Behavior Score”)
const MetricDefinitionSchema = new Schema({
  program: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
  name:    { type: String, required: true },
  // You can extend this to support different types
  type:    { type: String, enum: ['number','boolean','text','date'], default: 'number' }
});

module.exports = mongoose.model('MetricDefinition', MetricDefinitionSchema);
