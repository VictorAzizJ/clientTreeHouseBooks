const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

// A child or other person enrolled in a program
const AttendeeSchema = new Schema({
  program:   { type: Schema.Types.ObjectId, ref: 'Program', required: true },
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  // any other fields you want (age, guardian contact, etc.)
  joinedAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attendee', AttendeeSchema);
