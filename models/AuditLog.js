// models/AuditLog.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * AuditLog Schema
 * Tracks all changes to records across the application for audit purposes.
 * Captures who changed what, when, and the before/after values.
 */
const AuditLogSchema = new Schema({
  // Which model/collection was affected
  modelName: {
    type: String,
    required: true,
    enum: ['Member', 'Donation', 'Checkout', 'Program', 'User', 'TravelingStop', 'Organization', 'Visit', 'BookDistribution', 'SidewalkBooksWeek']
  },

  // The ID of the record that was changed
  recordId: {
    type: Schema.Types.ObjectId,
    required: true
  },

  // What action was performed
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'restore']
  },

  // Who performed the action
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Which fields were changed (for updates)
  changedFields: [{
    type: String
  }],

  // Previous values before the change
  previousValues: {
    type: Schema.Types.Mixed,
    default: {}
  },

  // New values after the change
  newValues: {
    type: Schema.Types.Mixed,
    default: {}
  },

  // Human-readable summary of the change
  summary: {
    type: String
  },

  // When the change occurred
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Query by model and record ID (most common - viewing history of a specific record)
AuditLogSchema.index({ modelName: 1, recordId: 1, timestamp: -1 });

// Query by user (find all changes made by a specific user)
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });

// Query by timestamp (recent activity across all records)
AuditLogSchema.index({ timestamp: -1 });

// Query by action type
AuditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
