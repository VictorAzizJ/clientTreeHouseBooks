// models/Checkout.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const CheckoutSchema = new Schema({
  member:        { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  numberOfBooks: { type: Number, required: true },
  genres:        [{
    type: String,
    enum: [
      'Kids Board Books',
      'Women Empowerment',
      'Black Author',
      'Young Adult'
    ],
    required: true
  }],
  weight:        { type: Number },                 // optional, in kg
  checkoutDate:  { type: Date, default: Date.now }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Index for finding checkouts by member (used in member detail page)
CheckoutSchema.index({ member: 1, checkoutDate: -1 });
// Index for date-based queries (used in admin analytics/charts)
CheckoutSchema.index({ checkoutDate: -1 });

module.exports = mongoose.model('Checkout', CheckoutSchema);
