// models/Member.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const MemberSchema = new Schema({
  firstName:   { type: String, required: true },
  lastName:    { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  phone:       { type: String },
  address:     { type: String },
  joinedAt:    { type: Date, default: Date.now },

  // ─── Parent-Child Relationships ──────────────────────────────────────────
  // Member type: 'adult' (parent/guardian) or 'child' (student)
  memberType:  { type: String, enum: ['adult', 'child'], default: 'adult' },

  // For children: reference to parent/guardian member
  parent:      { type: Schema.Types.ObjectId, ref: 'Member' },

  // Additional child-specific fields
  dateOfBirth: { type: Date },
  grade:       { type: String },
  school:      { type: String },

  // Emergency contact (if different from parent member)
  emergencyContact: {
    name:  { type: String },
    phone: { type: String },
    relationship: { type: String }
  },

  // Medical/special needs notes
  notes:       { type: String }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Email is already unique (creates index automatically)
// Add compound index for sorting by lastName + firstName (used in member list)
MemberSchema.index({ lastName: 1, firstName: 1 });
// Add index for joinedAt (used in admin analytics and date-based queries)
MemberSchema.index({ joinedAt: -1 }); // -1 = descending (newest first)
// Add index for parent lookups (find all children of a parent)
MemberSchema.index({ parent: 1 });
// Add index for member type filtering
MemberSchema.index({ memberType: 1 });

module.exports = mongoose.model('Member', MemberSchema);
