const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

// A child or other person enrolled in a program
const AttendeeSchema = new Schema({
  program:   { type: Schema.Types.ObjectId, ref: 'Program', required: true },
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },

  // ─── Member Sync ─────────────────────────────────────────────────────────
  // Link to member record (auto-created for classroom programs)
  member:    { type: Schema.Types.ObjectId, ref: 'Member' },

  // Parent/guardian member reference
  parentMember: { type: Schema.Types.ObjectId, ref: 'Member' },

  // ─── Additional Info ─────────────────────────────────────────────────────
  dateOfBirth: { type: Date },
  grade:       { type: String },
  school:      { type: String },

  // Contact info (if not synced to member)
  email:       { type: String },
  phone:       { type: String },

  joinedAt:  { type: Date, default: Date.now }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Index for finding attendees by program (used in program detail page)
AttendeeSchema.index({ program: 1 });
// Compound index for program aggregations/stats
AttendeeSchema.index({ program: 1, joinedAt: -1 });
// Index for member lookups
AttendeeSchema.index({ member: 1 });
// Index for parent member lookups
AttendeeSchema.index({ parentMember: 1 });

module.exports = mongoose.model('Attendee', AttendeeSchema);
