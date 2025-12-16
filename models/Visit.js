// models/Visit.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VisitSchema = new Schema({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  visitDate: { type: Date, default: Date.now },
  purpose: { type: String },
  notes: { type: String },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User' }
});

// Indexes for efficient queries
VisitSchema.index({ member: 1, visitDate: -1 });
VisitSchema.index({ visitDate: -1 });

module.exports = mongoose.model('Visit', VisitSchema);
