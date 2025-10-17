// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  // ─── Local Authentication Fields ────────────────────────────────────────────
  // Email is now the primary identifier for login
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  // Password hash (bcrypt). Never store plain-text passwords!
  // This field is set during registration and updated when password is changed.
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['volunteer', 'staff', 'admin'],
    default: 'volunteer'
  },

  // ─── Password Recovery Fields ───────────────────────────────────────────────
  // When a user requests password reset, we generate a random token and store it here.
  // The token is sent via email in a reset link: /reset-password?token=xyz123
  resetToken: {
    type: String,
    default: null
  },
  // Token expires after 1 hour (configurable). After expiry, the reset link is invalid.
  resetTokenExpiry: {
    type: Date,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Email is already unique (which creates an index automatically)
// Add index for password reset token lookups
UserSchema.index({ resetToken: 1 }, { sparse: true }); // sparse: only index docs with resetToken

// ─── Instance Methods ────────────────────────────────────────────────────────

// Compare a plain-text password with the stored hash
// Used during login to verify credentials
// Usage: const isValid = await user.comparePassword('userInputPassword');
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ─── Pre-save Hook ───────────────────────────────────────────────────────────
// Automatically hash password before saving to database
// Only hashes if password field has been modified (prevents re-hashing on every save)
UserSchema.pre('save', async function(next) {
  // Only hash password if it's new or has been modified
  if (!this.isModified('password')) return next();

  try {
    // Generate salt and hash password (10 rounds is standard for bcrypt)
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('User', UserSchema);
