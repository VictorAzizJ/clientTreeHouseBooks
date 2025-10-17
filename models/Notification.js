const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  title: String,
  body: String,
  senderRole: { type: String, enum: ['admin', 'staff'], required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetRoles: [{
    type: String,
    enum: ['admin', 'staff', 'volunteer'],
    default: ['volunteer']
  }], // new
  acknowledgedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }], // new
  createdAt: { type: Date, default: Date.now }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Compound index for dashboard notification queries
// Supports: targetRoles + acknowledgedBy + sorted by createdAt
notificationSchema.index({ targetRoles: 1, createdAt: -1 });
// Index for acknowledgement checks (used in dashboard query: acknowledgedBy: { $ne: userId })
notificationSchema.index({ acknowledgedBy: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
