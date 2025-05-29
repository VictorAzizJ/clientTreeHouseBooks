// models/Announcement.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const AnnouncementSchema = new Schema({
  sender:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipients: [{ type: String, enum: ['admin','staff','volunteer'], required: true }],
  content:    { type: String, required: true },
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);
