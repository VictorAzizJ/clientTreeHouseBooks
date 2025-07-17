const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

// Records whether an attendee was present on a given date
const AttendanceSchema = new Schema({
  attendee: { type: Schema.Types.ObjectId, ref: 'Attendee', required: true },
  date:     { type: Date, required: true },
  present:  { type: Boolean, default: true }
});

// Prevent double-entries
AttendanceSchema.index({ attendee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
