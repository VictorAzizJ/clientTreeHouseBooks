// models/BookDistribution.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookDistributionSchema = new Schema({
  // Event/Location information
  location:    { type: String, required: true },
  eventName:   { type: String },
  eventDate:   { type: Date, default: Date.now },

  // Book categories (same structure as Checkout)
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
