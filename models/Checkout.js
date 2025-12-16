// models/Checkout.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const CheckoutSchema = new Schema({
  member:        { type: Schema.Types.ObjectId, ref: 'Member', required: true },

  // New book categories structure (5 categories with qty + weight each)
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

  // Legacy fields kept for backward compatibility with existing data
  numberOfBooks: { type: Number },
  genres:        [{
    type: String,
    enum: [
      'Kids Board Books',
      'Women Empowerment',
      'Black Author',
      'Young Adult'
    ]
  }],
  weight:        { type: Number },

  checkoutDate:  { type: Date, default: Date.now },
  recordedBy:    { type: Schema.Types.ObjectId, ref: 'User' }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Index for finding checkouts by member (used in member detail page)
CheckoutSchema.index({ member: 1, checkoutDate: -1 });
// Index for date-based queries (used in admin analytics/charts)
CheckoutSchema.index({ checkoutDate: -1 });

module.exports = mongoose.model('Checkout', CheckoutSchema);
