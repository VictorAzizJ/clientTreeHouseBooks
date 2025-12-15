// models/TravelingStop.js
// ═══════════════════════════════════════════════════════════════════════════════
// Traveling Tree House Program - Stop Tracking Model
// Tracks mobile book distribution visits to daycares, branches, and community events
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ─── Stop Types ────────────────────────────────────────────────────────────────
// Extensible array - add new stop types here as needed
const STOP_TYPES = ['daycare', 'branch', 'community_event'];

// ─── Schema Definition ─────────────────────────────────────────────────────────
const TravelingStopSchema = new Schema({
  // ─── Core Fields (Required) ─────────────────────────────────────────────────
  // Date of the stop visit (stored as YYYY-MM-DD string per project convention)
  date: {
    type: String,
    required: [true, 'Date is required']
  },

  // Name/identifier for this stop location
  stopName: {
    type: String,
    required: [true, 'Stop name is required'],
    trim: true,
    maxlength: [200, 'Stop name cannot exceed 200 characters']
  },

  // Type of stop - determines which conditional fields apply
  stopType: {
    type: String,
    enum: {
      values: STOP_TYPES,
      message: '{VALUE} is not a valid stop type'
    },
    required: [true, 'Stop type is required']
  },

  // Physical address of the stop
  stopAddress: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },

  // ZIP code for geographic tracking and analytics
  stopZipCode: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Accepts 5-digit ZIP or ZIP+4 format (e.g., 12345 or 12345-6789)
        return /^\d{5}(-\d{4})?$/.test(v);
      },
      message: props => `${props.value} is not a valid ZIP code (use 12345 or 12345-6789 format)`
    }
  },

  // Number of books distributed at this stop
  booksDistributed: {
    type: Number,
    required: [true, 'Number of books distributed is required'],
    min: [0, 'Books distributed cannot be negative'],
    max: [100000, 'Books distributed seems too high - please verify']
  },

  // ─── Contact & Marketing Fields ─────────────────────────────────────────────
  // How the organization was contacted/requested for this stop
  contactMethod: {
    type: String,
    trim: true,
    maxlength: [500, 'Contact method cannot exceed 500 characters']
  },

  // How this location heard about TreeHouse Books
  howHeardAboutUs: {
    type: String,
    trim: true,
    maxlength: [500, 'How heard about us cannot exceed 500 characters']
  },

  // ─── Universal Conditional Field ────────────────────────────────────────────
  // Applies to ALL stop types - did we read to children at this stop?
  didWeReadToThem: {
    type: Boolean,
    default: false
  },

  // ─── Daycare-Specific Settings ──────────────────────────────────────────────
  // Only applicable when stopType is 'daycare'
  daycareSettings: {
    // Does this daycare have our sticker displayed?
    hasStickerDisplayed: {
      type: Boolean,
      default: false
    }
  },

  // ─── Branch-Specific Settings ───────────────────────────────────────────────
  // Only applicable when stopType is 'branch'
  branchSettings: {
    // Does this branch have TreeHouse Books signage displayed?
    hasSignageDisplayed: {
      type: Boolean,
      default: false
    }
  },

  // ─── Community Event-Specific Settings ──────────────────────────────────────
  // Only applicable when stopType is 'community_event'
  communityEventSettings: {
    // Were we featured on the event's promotional flyer?
    wereWeOnFlyer: {
      type: Boolean,
      default: false
    },
    // Did they promote us on their social media beforehand?
    featuredOnTheirSocialMedia: {
      type: Boolean,
      default: false
    },
    // Did we share/post about the event on our social media?
    didWeShareOnOurSocialMedia: {
      type: Boolean,
      default: false
    }
  },

  // ─── Notes ──────────────────────────────────────────────────────────────────
  // Free-form notes about the stop visit
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },

  // ─── Metadata ───────────────────────────────────────────────────────────────
  // Reference to the user who created this record
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Timestamps for record keeping
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
// Primary: Sort by date (most recent first) - common query pattern
TravelingStopSchema.index({ date: -1 });

// Compound: Filter by type and sort by date - for type-filtered lists
TravelingStopSchema.index({ stopType: 1, date: -1 });

// Geographic: Find stops by ZIP code - for location-based analytics
TravelingStopSchema.index({ stopZipCode: 1 });

// Audit: Sort by creation date - for recent entries view
TravelingStopSchema.index({ createdAt: -1 });

// ─── Pre-save Hook ───────────────────────────────────────────────────────────
// Automatically update the updatedAt timestamp on every save
TravelingStopSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ─── Static Properties ───────────────────────────────────────────────────────
// Expose stop types for use in routes and views
TravelingStopSchema.statics.STOP_TYPES = STOP_TYPES;

// ─── Static Methods ──────────────────────────────────────────────────────────
/**
 * Get aggregate statistics for all stops
 * @returns {Promise<Object>} Stats object with totals and breakdowns
 */
TravelingStopSchema.statics.getStats = async function() {
  const pipeline = [
    {
      $group: {
        _id: null,
        totalStops: { $sum: 1 },
        totalBooks: { $sum: '$booksDistributed' },
        uniqueLocations: { $addToSet: '$stopName' },
        uniqueZipCodes: { $addToSet: '$stopZipCode' }
      }
    },
    {
      $project: {
        _id: 0,
        totalStops: 1,
        totalBooks: 1,
        uniqueLocations: { $size: '$uniqueLocations' },
        uniqueZipCodes: { $size: '$uniqueZipCodes' }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || { totalStops: 0, totalBooks: 0, uniqueLocations: 0, uniqueZipCodes: 0 };
};

/**
 * Get statistics grouped by stop type
 * @returns {Promise<Object>} Stats by type
 */
TravelingStopSchema.statics.getStatsByType = async function() {
  const pipeline = [
    {
      $group: {
        _id: '$stopType',
        count: { $sum: 1 },
        totalBooks: { $sum: '$booksDistributed' },
        avgBooks: { $avg: '$booksDistributed' }
      }
    },
    {
      $project: {
        _id: 0,
        stopType: '$_id',
        count: 1,
        totalBooks: 1,
        avgBooks: { $round: ['$avgBooks', 0] }
      }
    }
  ];

  return this.aggregate(pipeline);
};

module.exports = mongoose.model('TravelingStop', TravelingStopSchema);
