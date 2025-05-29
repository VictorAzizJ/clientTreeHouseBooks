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

module.exports = mongoose.model('Checkout', CheckoutSchema);
