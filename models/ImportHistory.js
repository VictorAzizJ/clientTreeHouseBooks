// models/ImportHistory.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Track all data imports for audit and rollback
const ImportHistorySchema = new Schema({
  // Import metadata
  importType: {
    type: String,
    enum: ['members', 'checkouts', 'donations', 'programs', 'attendees', 'metrics'],
    required: true
  },

  // Who performed the import
  importedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  // Source information
  source: {
    type: String,
    enum: ['csv', 'knack', 'manual', 'api'],
    default: 'csv'
  },

  // Original filename
  fileName: { type: String },

  // Import statistics
  stats: {
    totalRows: { type: Number, default: 0 },
    successful: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 }
  },

  // Errors encountered
  errors: [{
    row: { type: Number },
    data: { type: Schema.Types.Mixed },
    error: { type: String }
  }],

  // Successfully imported record IDs (for rollback)
  importedRecords: [{
    model: { type: String },
    recordId: { type: Schema.Types.ObjectId }
  }],

  // Import status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'rolled_back'],
    default: 'pending'
  },

  // Timestamps
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },

  // Notes
  notes: { type: String }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
ImportHistorySchema.index({ importedBy: 1, startedAt: -1 });
ImportHistorySchema.index({ importType: 1, status: 1 });
ImportHistorySchema.index({ startedAt: -1 });

module.exports = mongoose.model('ImportHistory', ImportHistorySchema);
