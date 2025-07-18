// src/models/Donation.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const DonationSchema = new Schema({
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
  weight:        { type: Number },          // optional, kg
  donatedAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donation', DonationSchema);
