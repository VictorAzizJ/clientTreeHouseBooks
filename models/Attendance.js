// src/models/Attendance.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const AttendanceSchema = new Schema({
  program: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
  member:  { type: Schema.Types.ObjectId, ref: 'Member',  required: true },
  date:    { type: String, required: true }               // YYYY-MM-DD
}, {
  timestamps: true
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
