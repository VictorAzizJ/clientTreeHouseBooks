// models/Organization.js
// ═══════════════════════════════════════════════════════════════════════════════
// Organization Catalog Model
// Stores reusable organization details for Traveling Tree House stops
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ─── Organization Types ──────────────────────────────────────────────────────
const ORGANIZATION_TYPES = ['daycare', 'branch', 'community_partner', 'other'];

// ─── Schema Definition ───────────────────────────────────────────────────────
const OrganizationSchema = new Schema({
  // Organization name (required)
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    maxlength: [200, 'Organization name cannot exceed 200 characters']
  },

  // Physical address
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },

  // ZIP code
  zipCode: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^\d{5}(-\d{4})?$/.test(v);
      },
      message: props => `${props.value} is not a valid ZIP code`
    }
  },

  // How this organization contacts us / how we contact them
  contactMethod: {
    type: String,
    trim: true,
    maxlength: [500, 'Contact method cannot exceed 500 characters']
  },

  // How they heard about TreeHouse Books
  howHeardAboutUs: {
    type: String,
    trim: true,
    maxlength: [500, 'How heard about us cannot exceed 500 characters']
  },

  // Type of organization
  organizationType: {
    type: String,
    enum: {
      values: ORGANIZATION_TYPES,
      message: '{VALUE} is not a valid organization type'
    },
    default: 'other'
  },

  // Additional notes
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },

  // Whether this organization is active (legacy - use isDeleted instead)
  isActive: {
    type: Boolean,
    default: true
  },

  // Metadata
  createdBy: {
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
  },

  // ─── Audit & Soft Delete Fields ─────────────────────────────────────────────
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Primary lookup by name
OrganizationSchema.index({ name: 1 });

// Text search index for fuzzy matching
OrganizationSchema.index({ name: 'text' });

// Filter by type and active status
OrganizationSchema.index({ organizationType: 1, isActive: 1 });

// Index for soft delete filtering
OrganizationSchema.index({ isDeleted: 1 });

// ─── Pre-save Hook ───────────────────────────────────────────────────────────
OrganizationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ─── Static Properties ───────────────────────────────────────────────────────
OrganizationSchema.statics.ORGANIZATION_TYPES = ORGANIZATION_TYPES;

// ─── Static Methods ──────────────────────────────────────────────────────────
/**
 * Search organizations by name
 * @param {String} query - Search term
 * @param {Number} limit - Max results to return
 * @returns {Promise<Array>} Matching organizations
 */
OrganizationSchema.statics.search = async function(query, limit = 10) {
  const regex = new RegExp(query, 'i');
  return this.find({
    name: regex,
    isActive: true
  })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('Organization', OrganizationSchema);
