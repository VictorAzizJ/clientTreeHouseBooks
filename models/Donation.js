// models/Donation.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const DonationSchema = new Schema({
  // Donation type: used or new books
  donationType:   { type: String, enum: ['used', 'new'], required: true },

  // Donor information
  donorType:      { type: String, enum: ['organization', 'person', 'undisclosed'], default: 'undisclosed' },
  donorName:      { type: String },  // Legacy field - kept for backward compatibility
  member:         { type: Schema.Types.ObjectId, ref: 'Member' },  // For person donors
  organization:   { type: Schema.Types.ObjectId, ref: 'Organization' },  // For org donors

  // Book information
  numberOfBooks:  { type: Number, required: true },

  // Value information for tax receipts
  valuePerBook:   { type: Number },  // For used books: $1 or $2 per book
  totalValue:     { type: Number },  // Calculated or entered total value

  // Monetary donation (optional, separate from book value)
  monetaryAmount: { type: Number, default: 0 },

  // Book Drive indicator
  isBookDrive:    { type: Boolean, default: false },
  bookDriveName:  { type: String },  // Optional name/description of book drive

  // Notes
  notes:          { type: String },

  donatedAt:      { type: Date, default: Date.now },
  recordedBy:     { type: Schema.Types.ObjectId, ref: 'User' },

  // ─── Audit & Soft Delete Fields ─────────────────────────────────────────────
  updatedBy:      { type: Schema.Types.ObjectId, ref: 'User' },
  updatedAt:      { type: Date },
  isDeleted:      { type: Boolean, default: false },
  deletedAt:      { type: Date },
  deletedBy:      { type: Schema.Types.ObjectId, ref: 'User' }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Index for finding donations by member (used in member detail page)
DonationSchema.index({ member: 1, donatedAt: -1 });
// Index for date-based queries (used in admin analytics/charts)
DonationSchema.index({ donatedAt: -1 });
// Index for soft delete filtering
DonationSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Donation', DonationSchema);
