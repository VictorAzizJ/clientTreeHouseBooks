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

module.exports = mongoose.model('Notification', notificationSchema);
