// models/Donation.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const DonationSchema = new Schema({
  // Donation type: used or new books
  donationType:   { type: String, enum: ['used', 'new'], required: true },

  // Donor information
  donorType:      { type: String, enum: ['organization', 'person', 'undisclosed'], default: 'undisclosed' },
  donorName:      { type: String },  // For org/person name when not linked to member
  member:         { type: Schema.Types.ObjectId, ref: 'Member' },  // Now optional

  // Book information
  numberOfBooks:  { type: Number, required: true },

  // Monetary donation (optional)
  monetaryAmount: { type: Number, default: 0 },

  // Notes
  notes:          { type: String },

  donatedAt:      { type: Date, default: Date.now },
  recordedBy:     { type: Schema.Types.ObjectId, ref: 'User' }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Index for finding donations by member (used in member detail page)
DonationSchema.index({ member: 1, donatedAt: -1 });
// Index for date-based queries (used in admin analytics/charts)
DonationSchema.index({ donatedAt: -1 });

module.exports = mongoose.model('Donation', DonationSchema);
