const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// A "program" (e.g. story-time, summer camp, after-school program, etc.)
const ProgramSchema = new Schema({
  name:        { type: String, required: true },
  description: { type: String },

  // ─── Program Template ────────────────────────────────────────────────────
  // Template type: 'custom', 'classroom', 'workshop', etc.
  templateType: {
    type: String,
    enum: ['custom', 'classroom', 'workshop', 'camp'],
    default: 'custom'
  },

  // ─── Classroom-Specific Settings ─────────────────────────────────────────
  // Only applicable when templateType is 'classroom'
  classroomSettings: {
    // Auto-sync attendees to members database
    autoSyncAttendees: { type: Boolean, default: true },

    // Require parent/guardian for attendees
    requireParent: { type: Boolean, default: true },

    // Default metric tracking enabled
    trackAttendance: { type: Boolean, default: true },
    trackBehavior:   { type: Boolean, default: true },
    trackGrades:     { type: Boolean, default: true },

    // Grade levels for this program
    gradeLevels: [{ type: String }],

    // Meeting schedule
    schedule: {
      days: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
      startTime: { type: String },
      endTime:   { type: String }
    }
  },

  // Program status
  active: { type: Boolean, default: true },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
ProgramSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Program', ProgramSchema);
