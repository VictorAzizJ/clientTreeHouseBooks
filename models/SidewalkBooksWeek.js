// models/SidewalkBooksWeek.js
// ═══════════════════════════════════════════════════════════════════════════════
// Sidewalk Books Program - Weekly Inventory Tracking Model
// Tracks start and end of week book counts for the Sidewalk Books program
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SidewalkBooksWeekSchema = new Schema({
  // Week date range
  weekStart: {
    type: Date,
    required: [true, 'Week start date is required']
  },
  weekEnd: {
    type: Date,
    required: [true, 'Week end date is required']
  },

  // Book counts
  startCount: {
    type: Number,
    required: [true, 'Start of week count is required'],
    min: [0, 'Count cannot be negative']
  },
  endCount: {
    type: Number,
    required: [true, 'End of week count is required'],
    min: [0, 'Count cannot be negative']
  },

  // Notes
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },

  // Metadata
  recordedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Primary: Sort by week start date (most recent first)
SidewalkBooksWeekSchema.index({ weekStart: -1 });

// Unique constraint to prevent duplicate weeks
SidewalkBooksWeekSchema.index({ weekStart: 1 }, { unique: true });

// ─── Virtual: Change ─────────────────────────────────────────────────────────
// Calculate the change between start and end counts
SidewalkBooksWeekSchema.virtual('change').get(function() {
  return this.endCount - this.startCount;
});

// ─── Pre-save Hook ───────────────────────────────────────────────────────────
SidewalkBooksWeekSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Ensure virtuals are included in JSON output
SidewalkBooksWeekSchema.set('toJSON', { virtuals: true });
SidewalkBooksWeekSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SidewalkBooksWeek', SidewalkBooksWeekSchema);
