const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

// Holds the value of a metric for an attendee on a date
const MetricValueSchema = new Schema({
  attendee: { type: Schema.Types.ObjectId, ref: 'Attendee', required: true },
  metric:   { type: Schema.Types.ObjectId, ref: 'MetricDefinition', required: true },
  date:     { type: Date, default: Date.now },
  value:    Schema.Types.Mixed
});

module.exports = mongoose.model('MetricValue', MetricValueSchema);
