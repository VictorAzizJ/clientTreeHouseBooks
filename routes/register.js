// routes/register.js
// ═════════════════════════════════════════════════════════════════════════════
// REGISTRATION ROUTES - Local user registration with bcrypt password hashing
// ═════════════════════════════════════════════════════════════════════════════
//
// 📝 REGISTRATION FLOW:
//
// 1. User visits /custom-signup (GET) → sees signup form
// 2. User submits firstName, lastName, email, password → POST /register
// 3. Server validates input (express-validator)
// 4. Server checks email doesn't already exist
// 5. Server creates new User document with plain-text password
// 6. Mongoose pre-save hook (in models/User.js) automatically hashes password with bcrypt
// 7. User saved to MongoDB with hashed password
// 8. User redirected to login page with success message
//
// 🔒 SECURITY NOTES:
//
// - Input validation prevents injection attacks and malformed data
// - Passwords are NEVER stored in plain text
// - Bcrypt automatically salts and hashes (10 rounds) via User model pre-save hook
// - Email addresses are stored in lowercase and trimmed for consistency
// - Default role is 'volunteer' (can be promoted by admin later)
//
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const User = require('../models/User');

// ─── GET /custom-signup ──────────────────────────────────────────────────────
// Render the custom sign-up form
router.get('/custom-signup', (req, res) => {
  const { error, success } = req.query;
  res.render('customSignup', { error, success });
});

// ─── POST /register ──────────────────────────────────────────────────────────
// Handle user registration with local authentication
router.post(
  '/register',
  [
    // Validation rules
    body('firstName')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters')
      .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

    body('lastName')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters')
      .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number')
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      const errorMsg = encodeURIComponent(firstError);
      return res.redirect(`/custom-signup?error=${errorMsg}`);
    }

    const { firstName, lastName, email, password } = req.body;

    try {
      // 1. Check if email already exists (case-insensitive)
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        // Email already exists - redirect to login instead
        const errorMsg = encodeURIComponent('This email is already registered. Redirecting you to login...');
        console.log(`⚠️  Registration attempt with existing email: ${email}`);
        // Redirect to login page with email pre-filled
        return res.redirect(`/custom-login?error=${errorMsg}&email=${encodeURIComponent(email)}`);
      }

      // 2. Create new user
      // Password will be automatically hashed by the pre-save hook in models/User.js
      const newUser = await User.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase(),
        password: password, // Will be hashed by Mongoose pre-save hook
        role: 'volunteer'   // Default role (can be changed by admin later)
      });

      console.log(`✅ New user registered: ${newUser.email} (ID: ${newUser._id})`);

      // 3. Redirect to login with success message
      const successMsg = encodeURIComponent('Account created successfully! Please log in.');
      res.redirect(`/custom-login?success=${successMsg}&email=${encodeURIComponent(email)}`);

    } catch (err) {
      console.error('Registration error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        name: err.name
      });

      let errorMsg = 'An error occurred during registration. Please try again.';

      // Provide more specific error messages
      if (err.code === 11000) {
        // Duplicate key error (email already exists)
        // This is a backup check in case the findOne check above missed it (race condition)
        errorMsg = 'This email is already registered. Redirecting you to login...';
        const emailEncoded = encodeURIComponent(email);
        return res.redirect(`/custom-login?error=${encodeURIComponent(errorMsg)}&email=${emailEncoded}`);
      } else if (err.name === 'ValidationError') {
        errorMsg = 'Please check your information and try again.';
      } else if (err.message && process.env.NODE_ENV !== 'production') {
        // Use the actual error message for debugging (only in development)
        errorMsg = `Error: ${err.message}`;
      }

      res.redirect(`/custom-signup?error=${encodeURIComponent(errorMsg)}`);
    }
  }
);

module.exports = router;
