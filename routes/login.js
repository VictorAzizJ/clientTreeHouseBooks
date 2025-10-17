// routes/login.js
// ═════════════════════════════════════════════════════════════════════════════
// LOGIN ROUTES - Local authentication with bcrypt
// ═════════════════════════════════════════════════════════════════════════════
//
// 🔐 AUTHENTICATION FLOW:
//
// 1. User visits /custom-login (GET) → sees login form
// 2. User submits email + password → POST /login
// 3. Server looks up user by email in MongoDB
// 4. Server uses bcrypt to compare submitted password with stored hash
// 5. If valid: create session with user data → redirect to /dashboard
// 6. If invalid: redirect back to login form with error message
//
// Session data stored in req.session.user contains:
// { _id, email, firstName, lastName, role }
//
// This session persists in MongoDB (via connect-mongo) and survives server restarts.
//
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

// ─── GET /custom-login ───────────────────────────────────────────────────────
// Render the login form
// Query params: ?error=message&email=prefilled&success=message
router.get('/custom-login', (req, res) => {
  const { error, email, success } = req.query;
  res.render('customLogin', { error, email, success });
});

// ─── POST /login ─────────────────────────────────────────────────────────────
// Handle login with local authentication (bcrypt password verification)
router.post(
  '/login',
  [
    // Validation rules
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      const errorMsg = encodeURIComponent(firstError);
      const enteredEmail = encodeURIComponent(req.body.email || '');
      return res.redirect(`/custom-login?error=${errorMsg}&email=${enteredEmail}`);
    }

    const { email, password } = req.body;

    try {
      // 1. Find user by email (case-insensitive)
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        // User not found - redirect with error
        const errorMsg = encodeURIComponent('Invalid email or password.');
        const enteredEmail = encodeURIComponent(req.body.email);
        return res.redirect(`/custom-login?error=${errorMsg}&email=${enteredEmail}`);
      }

      // 2. Compare password using bcrypt (via User model method)
      // user.comparePassword() is defined in models/User.js
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        // Invalid password - redirect with error
        const errorMsg = encodeURIComponent('Invalid email or password.');
        const enteredEmail = encodeURIComponent(req.body.email);
        return res.redirect(`/custom-login?error=${errorMsg}&email=${enteredEmail}`);
      }

      // 3. Authentication successful - create session
      req.session.user = {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      };

      // 4. Set success flash message (read once in dashboard, then deleted)
      req.session.success = `Welcome back, ${user.firstName}!`;

      // 5. Redirect to dashboard (role-specific dashboard rendered by /dashboard route)
      res.redirect('/dashboard');

    } catch (err) {
      console.error('Login error:', err);
      const errorMsg = encodeURIComponent('An error occurred during login. Please try again.');
      res.redirect(`/custom-login?error=${errorMsg}`);
    }
  }
);

module.exports = router;
