// models/Checkout.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const CheckoutSchema = new Schema({
  member:      { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  bookTitle:   { type: String, required: true },
  checkoutOn:  { type: Date, default: Date.now },
  dueOn:       { type: Date, required: true },
  returnedOn:  { type: Date }
});

module.exports = mongoose.model('Checkout', CheckoutSchema);
