// models/SidewalkInventory.js
// ═══════════════════════════════════════════════════════════════════════════════
// Unified Sidewalk Inventory Model
// Tracks weekly inventory for all sidewalk categories:
// - Carts, Stacks, Readers, Little Tree House
// All categories share the same formula logic from config/sidewalkFormulas.js
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { FORMULAS, SIDEWALK_CATEGORIES, isValidCategory } = require('../config/sidewalkFormulas');

const SidewalkInventorySchema = new Schema({
  // Category identifier (carts, stacks, readers, littleTreeHouse)
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: Object.keys(SIDEWALK_CATEGORIES),
      message: 'Invalid category. Must be one of: carts, stacks, readers, littleTreeHouse'
    },
    index: true
  },

  // Week date range
  weekStart: {
    type: Date,
    required: [true, 'Week start date is required']
  },
  weekEnd: {
    type: Date,
    required: [true, 'Week end date is required']
  },

  // Book counts - editable values
  startCount: {
    type: Number,
    required: [true, 'Start of week count is required'],
    min: [0, 'Count cannot be negative'],
    default: 0
  },
  endCount: {
    type: Number,
    required: [true, 'End of week count is required'],
    min: [0, 'Count cannot be negative'],
    default: 0
  },

  // Optional target count for restock calculations
  targetCount: {
    type: Number,
    min: [0, 'Target count cannot be negative'],
    default: 50
  },

  // Location details (optional, useful for Carts and Little Tree House)
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
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
// Compound index for category + week (most common query pattern)
SidewalkInventorySchema.index({ category: 1, weekStart: -1 });

// Unique constraint: one record per category per week
SidewalkInventorySchema.index({ category: 1, weekStart: 1 }, { unique: true });

// Index for date range queries
SidewalkInventorySchema.index({ weekStart: -1 });

// ─── Virtuals: Calculated Fields ─────────────────────────────────────────────
// These use the centralized formulas from sidewalkFormulas.js

// Change calculation (endCount - startCount)
SidewalkInventorySchema.virtual('change').get(function() {
  return FORMULAS.calculateChange(this.startCount, this.endCount);
});

// Percentage change
SidewalkInventorySchema.virtual('percentChange').get(function() {
  return FORMULAS.calculatePercentChange(this.startCount, this.endCount);
});

// Distribution rate (books per day)
SidewalkInventorySchema.virtual('distributionRate').get(function() {
  return FORMULAS.calculateDistributionRate(this.startCount, this.endCount);
});

// Restock amount needed
SidewalkInventorySchema.virtual('restockNeeded').get(function() {
  return FORMULAS.calculateRestockNeeded(this.endCount, this.targetCount);
});

// Trend indicator
SidewalkInventorySchema.virtual('trend').get(function() {
  return FORMULAS.determineTrend(this.startCount, this.endCount);
});

// Category display info
SidewalkInventorySchema.virtual('categoryInfo').get(function() {
  return SIDEWALK_CATEGORIES[this.category] || null;
});

// ─── Pre-save Hook ───────────────────────────────────────────────────────────
SidewalkInventorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ─── Static Methods ──────────────────────────────────────────────────────────

/**
 * Get all records for a specific category
 */
SidewalkInventorySchema.statics.findByCategory = function(category, limit = 100) {
  return this.find({ category })
    .populate('recordedBy', 'firstName lastName')
    .sort({ weekStart: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get all records for a specific week across all categories
 */
SidewalkInventorySchema.statics.findByWeek = function(weekStart) {
  return this.find({ weekStart: new Date(weekStart) })
    .populate('recordedBy', 'firstName lastName')
    .sort({ category: 1 })
    .lean();
};

/**
 * Get summary stats for all categories
 */
SidewalkInventorySchema.statics.getCategorySummary = async function() {
  const summary = await this.aggregate([
    {
      $group: {
        _id: '$category',
        totalRecords: { $sum: 1 },
        latestWeek: { $max: '$weekStart' },
        avgStartCount: { $avg: '$startCount' },
        avgEndCount: { $avg: '$endCount' }
      }
    },
    {
      $project: {
        category: '$_id',
        totalRecords: 1,
        latestWeek: 1,
        avgStartCount: { $round: ['$avgStartCount', 0] },
        avgEndCount: { $round: ['$avgEndCount', 0] },
        avgChange: { $round: [{ $subtract: ['$avgEndCount', '$avgStartCount'] }, 0] }
      }
    }
  ]);

  return summary;
};

/**
 * Get the most recent record for each category
 */
SidewalkInventorySchema.statics.getLatestByCategory = async function() {
  const latest = await this.aggregate([
    { $sort: { weekStart: -1 } },
    {
      $group: {
        _id: '$category',
        latestRecord: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestRecord' }
    }
  ]);

  return latest;
};

// Ensure virtuals are included in JSON output
SidewalkInventorySchema.set('toJSON', { virtuals: true });
SidewalkInventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SidewalkInventory', SidewalkInventorySchema);
