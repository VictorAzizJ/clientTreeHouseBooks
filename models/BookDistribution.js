// models/BookDistribution.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookDistributionSchema = new Schema({
  // Recipient information
  recipientType: {
    type: String,
    enum: ['member', 'organization'],
    required: true
  },
  member:       { type: Schema.Types.ObjectId, ref: 'Member' },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization' },

  // Legacy location field for backward compatibility
  location:    { type: String },

  // Event information
  eventName:   { type: String },
  eventDate:   { type: Date, default: Date.now },

  // Simple total books count
  totalBooks:  { type: Number, required: true, min: 1 },

  // Legacy bookCategories for backward compatibility with existing data
  bookCategories: {
    blackAuthorAdult: {
      quantity: { type: Number, default: 0 },
      weight: { type: Number, default: 0 }
    },
    adult: {
      quantity: { type: Number, default: 0 },
      weight: { type: Number, default: 0 }
    },
    blackAuthorKids: {
      quantity: { type: Number, default: 0 },
      weight: { type: Number, default: 0 }
    },
    kids: {
      quantity: { type: Number, default: 0 },
      weight: { type: Number, default: 0 }
    },
    boardBooks: {
      quantity: { type: Number, default: 0 },
      weight: { type: Number, default: 0 }
    }
  },

  notes:       { type: String },
  recordedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now }
});

// Indexes for efficient queries
BookDistributionSchema.index({ eventDate: -1 });
BookDistributionSchema.index({ location: 1 });

module.exports = mongoose.model('BookDistribution', BookDistributionSchema);
