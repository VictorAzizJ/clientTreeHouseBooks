// models/Member.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const MemberSchema = new Schema({
  firstName:   { type: String, required: true },
  lastName:    { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  phone:       { type: String },
  address:     { type: String },
  joinedAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Member', MemberSchema);
