const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Compound index for dashboard message queries ($or: senderId or recipientId)
// These support both "messages I sent" and "messages sent to me" queries
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
