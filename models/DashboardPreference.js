// models/DashboardPreference.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Store user dashboard customization preferences
const DashboardPreferenceSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // Widget visibility settings (default: all visible)
  widgetVisibility: {
    type: Map,
    of: Boolean,
    default: () => new Map([
      ['notifications', true],
      ['announcements', true],
      ['messages', true],
      ['users', true],
      ['checkouts', true],
      ['donations', true],
      ['members', true],
      ['programs', true],
      ['metrics', true]
    ])
  },

  // Widget order/layout (array of widget IDs)
  widgetOrder: {
    type: [String],
    default: [
      'notifications',
      'announcements',
      'messages',
      'users',
      'checkouts',
      'donations',
      'members',
      'programs',
      'metrics'
    ]
  },

  // Chart preferences
  chartPreferences: {
    checkoutsChartType: { type: String, enum: ['line', 'bar'], default: 'line' },
    donationsChartType: { type: String, enum: ['line', 'bar'], default: 'line' },
    membersChartType: { type: String, enum: ['line', 'bar'], default: 'bar' },
    programsChartType: { type: String, enum: ['bar', 'pie', 'doughnut'], default: 'bar' }
  }
}, {
  timestamps: true
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Unique index on user ensures one preference doc per user
DashboardPreferenceSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model('DashboardPreference', DashboardPreferenceSchema);
