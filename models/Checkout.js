// models/Checkout.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const CheckoutSchema = new Schema({
  member:        { type: Schema.Types.ObjectId, ref: 'Member', required: true },

  // Book categories structure (5 categories with qty only)
  bookCategories: {
    blackAuthorAdult: {
      quantity: { type: Number, default: 0 }
    },
    adult: {
      quantity: { type: Number, default: 0 }
    },
    blackAuthorKids: {
      quantity: { type: Number, default: 0 }
    },
    kids: {
      quantity: { type: Number, default: 0 }
    },
    boardBooks: {
      quantity: { type: Number, default: 0 }
    }
  },

  // Single total weight for entire checkout (lbs)
  totalWeight:   { type: Number, default: 0 },

  // Optional monetary donation made during checkout
  monetaryDonation: { type: Number, default: 0 },

  // Legacy/computed fields
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
  weight:        { type: Number },  // Legacy - kept for old data

  checkoutDate:  { type: Date, default: Date.now },
  recordedBy:    { type: Schema.Types.ObjectId, ref: 'User' },

  // ─── Audit & Soft Delete Fields ─────────────────────────────────────────────
  updatedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
  updatedAt:     { type: Date },
  isDeleted:     { type: Boolean, default: false },
  deletedAt:     { type: Date },
  deletedBy:     { type: Schema.Types.ObjectId, ref: 'User' }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Index for finding checkouts by member (used in member detail page)
CheckoutSchema.index({ member: 1, checkoutDate: -1 });
// Index for date-based queries (used in admin analytics/charts)
CheckoutSchema.index({ checkoutDate: -1 });
// Index for soft delete filtering
CheckoutSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Checkout', CheckoutSchema);
