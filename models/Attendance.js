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

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Compound index for program attendance queries
AttendanceSchema.index({ program: 1, date: -1 });
// Index for finding attendance by member
AttendanceSchema.index({ member: 1, date: -1 });
// Unique constraint: one attendance record per program+member+date
AttendanceSchema.index({ program: 1, member: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
