// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  oktaId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['volunteer', 'staff', 'admin'],
    default: 'volunteer'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
