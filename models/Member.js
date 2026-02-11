// models/Member.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const MemberSchema = new Schema({
  firstName:   { type: String, required: true },
  lastName:    { type: String, required: true },
  email:       {
    type: String,
    unique: true,
    sparse: true  // Allow multiple null values for members without email
  },
  phone:       { type: String },
  address:     { type: String },
  zipCode:     { type: String },  // Zip code - visible to all roles
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
  notes:       { type: String },

  // ─── Adult Transformation Fields ────────────────────────────────────────────
  // Track when a child account was transformed to adult (at age 18)
  transformedToAdultAt: { type: Date },
  // Flag to prompt for email on next check-in (set when child becomes adult)
  needsEmailPrompt: { type: Boolean, default: false },

  // ─── Audit & Soft Delete Fields ─────────────────────────────────────────────
  // Track who last updated this record
  updatedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  updatedAt:   { type: Date },

  // Soft delete fields (record is hidden but not permanently deleted)
  isDeleted:   { type: Boolean, default: false },
  deletedAt:   { type: Date },
  deletedBy:   { type: Schema.Types.ObjectId, ref: 'User' }
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
// Add index for soft delete filtering
MemberSchema.index({ isDeleted: 1 });
// Add index for dateOfBirth (used for age-based filtering)
MemberSchema.index({ dateOfBirth: 1 });
// Compound index for efficient child age queries
MemberSchema.index({ memberType: 1, dateOfBirth: 1 });

// ─── Virtual: Calculate Age ─────────────────────────────────────────────────
MemberSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const dob = new Date(this.dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
});

// Ensure virtuals are included in JSON and object output
MemberSchema.set('toJSON', { virtuals: true });
MemberSchema.set('toObject', { virtuals: true });

// ─── Static: Get date cutoff for age filter ─────────────────────────────────
MemberSchema.statics.getDateCutoffForAge = function(maxAge) {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - maxAge);
  return cutoff;
};

// ─── Static: Check and transform child to adult if 18+ ──────────────────────
// Returns true if transformation occurred
MemberSchema.statics.checkAndTransformToAdult = async function(memberId) {
  const member = await this.findById(memberId);
  if (!member) return false;

  // Only transform children with a DOB who are 18+
  if (member.memberType !== 'child' || !member.dateOfBirth) return false;

  const age = member.age; // Uses the virtual
  if (age >= 18) {
    member.memberType = 'adult';
    member.transformedToAdultAt = new Date();
    member.needsEmailPrompt = !member.email; // Only prompt if no email
    await member.save();
    console.log(`✅ Member ${member.firstName} ${member.lastName} auto-transformed to adult (age ${age})`);
    return true;
  }
  return false;
};

// ─── Static: Batch transform all children who are now 18+ ───────────────────
MemberSchema.statics.transformAllAdultChildren = async function() {
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

  const result = await this.updateMany(
    {
      memberType: 'child',
      dateOfBirth: { $lte: eighteenYearsAgo },
      isDeleted: { $ne: true }
    },
    {
      $set: {
        memberType: 'adult',
        transformedToAdultAt: new Date(),
        needsEmailPrompt: true
      }
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`✅ Batch transformed ${result.modifiedCount} children to adults`);
  }
  return result.modifiedCount;
};

// ─── Instance method: Check if this member needs email prompt ───────────────
MemberSchema.methods.checkEmailPrompt = function() {
  return this.needsEmailPrompt && !this.email;
};

// ─── Instance method: Clear email prompt flag ───────────────────────────────
MemberSchema.methods.clearEmailPrompt = async function() {
  if (this.needsEmailPrompt) {
    this.needsEmailPrompt = false;
    await this.save();
  }
};

module.exports = mongoose.model('Member', MemberSchema);
