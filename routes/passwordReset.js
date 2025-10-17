// routes/passwordReset.js
// ═════════════════════════════════════════════════════════════════════════════
// PASSWORD RESET ROUTES - Forgot password & reset password functionality
// ═════════════════════════════════════════════════════════════════════════════
//
// 🔄 PASSWORD RESET FLOW (Full Process):
//
// STEP 1: User Requests Reset
//   → User visits /forgot-password (GET) → sees form asking for email
//   → User submits email → POST /forgot-password
//
// STEP 2: Server Generates Reset Token
//   → Server looks up user by email
//   → Server generates a random 32-byte token (crypto.randomBytes)
//   → Server saves token to user.resetToken + expiry time (1 hour from now)
//   → Server sends email with reset link: /reset-password?token=abc123xyz
//
// STEP 3: User Clicks Email Link
//   → User clicks link → GET /reset-password?token=abc123xyz
//   → Server validates token (exists, not expired)
//   → If valid: show password reset form
//   → If invalid/expired: show error message
//
// STEP 4: User Submits New Password
//   → User enters new password (twice for confirmation) → POST /reset-password
//   → Server validates token again
//   → Server updates user.password (Mongoose pre-save hook hashes it automatically)
//   → Server clears token fields (resetToken, resetTokenExpiry)
//   → User redirected to login with success message
//
// 🔒 SECURITY NOTES:
//
// - Token is cryptographically random (32 bytes = 64 hex characters)
// - Token expires after 1 hour (configurable)
// - Token is single-use (cleared after password reset)
// - Token is stored hashed in database (optional enhancement)
// - Email must match exactly (case-insensitive)
// - Password requirements enforced (minimum 8 characters)
//
// 📧 EMAIL CONFIGURATION:
//
// - Uses services/mailer.js (Nodemailer)
// - Requires EMAIL_USER, EMAIL_PASSWORD environment variables
// - See services/mailer.js for Google Workspace setup instructions
//
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../services/mailer');
const router = express.Router();

// ─── GET /forgot-password ────────────────────────────────────────────────────
// Render the "forgot password" form where user enters their email
router.get('/forgot-password', (req, res) => {
  const { error, success } = req.query;
  res.render('forgotPassword', { error, success });
});

// ─── POST /forgot-password ───────────────────────────────────────────────────
// Handle forgot password request: generate token, save to DB, send email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // 1. Validate email provided
    if (!email) {
      const errorMsg = encodeURIComponent('Please enter your email address.');
      return res.redirect(`/forgot-password?error=${errorMsg}`);
    }

    // 2. Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Security note: Don't reveal if email exists or not (prevents user enumeration)
    // Always show success message even if email not found
    if (!user) {
      const successMsg = encodeURIComponent(
        'If an account with that email exists, a password reset link has been sent.'
      );
      return res.redirect(`/forgot-password?success=${successMsg}`);
    }

    // 3. Generate random reset token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 4. Set token expiry (1 hour from now)
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // 5. Save token to user document
    user.resetToken = resetToken;
    user.resetTokenExpiry = tokenExpiry;
    await user.save();

    // 6. Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.firstName);
      console.log(`✅ Password reset email sent to: ${user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      // Clear token if email fails
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();

      const errorMsg = encodeURIComponent(
        'Failed to send reset email. Please ensure email is configured or contact an administrator.'
      );
      return res.redirect(`/forgot-password?error=${errorMsg}`);
    }

    // 7. Show success message (same message whether user exists or not)
    const successMsg = encodeURIComponent(
      'If an account with that email exists, a password reset link has been sent. Check your email.'
    );
    res.redirect(`/forgot-password?success=${successMsg}`);

  } catch (err) {
    console.error('Forgot password error:', err);
    const errorMsg = encodeURIComponent('An error occurred. Please try again.');
    res.redirect(`/forgot-password?error=${errorMsg}`);
  }
});

// ─── GET /reset-password ─────────────────────────────────────────────────────
// Render the password reset form (user arrives here from email link)
// URL format: /reset-password?token=abc123xyz
router.get('/reset-password', async (req, res) => {
  const { token } = req.query;
  const { error, success } = req.query;

  // 1. Validate token is present
  if (!token) {
    return res.render('resetPassword', {
      error: 'Invalid or missing reset token.',
      success: null,
      token: null
    });
  }

  try {
    // 2. Find user with this token
    const user = await User.findOne({ resetToken: token });

    if (!user) {
      return res.render('resetPassword', {
        error: 'Invalid or expired reset token.',
        success: null,
        token: null
      });
    }

    // 3. Check if token has expired
    if (user.resetTokenExpiry < Date.now()) {
      return res.render('resetPassword', {
        error: 'This reset link has expired. Please request a new one.',
        success: null,
        token: null
      });
    }

    // 4. Token is valid - show password reset form
    res.render('resetPassword', {
      error: error || null,
      success: success || null,
      token: token
    });

  } catch (err) {
    console.error('Reset password GET error:', err);
    res.render('resetPassword', {
      error: 'An error occurred. Please try again.',
      success: null,
      token: null
    });
  }
});

// ─── POST /reset-password ────────────────────────────────────────────────────
// Handle password reset form submission
router.post('/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  try {
    // 1. Validate token provided
    if (!token) {
      const errorMsg = encodeURIComponent('Invalid or missing reset token.');
      return res.redirect(`/reset-password?error=${errorMsg}`);
    }

    // 2. Validate passwords match
    if (password !== confirmPassword) {
      const errorMsg = encodeURIComponent('Passwords do not match.');
      return res.redirect(`/reset-password?token=${token}&error=${errorMsg}`);
    }

    // 3. Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      const errorMsg = encodeURIComponent('Password must be at least 8 characters long.');
      return res.redirect(`/reset-password?token=${token}&error=${errorMsg}`);
    }

    // 4. Find user with this token
    const user = await User.findOne({ resetToken: token });

    if (!user) {
      const errorMsg = encodeURIComponent('Invalid or expired reset token.');
      return res.redirect(`/reset-password?error=${errorMsg}`);
    }

    // 5. Check if token has expired
    if (user.resetTokenExpiry < Date.now()) {
      const errorMsg = encodeURIComponent('This reset link has expired. Please request a new one.');
      return res.redirect(`/forgot-password?error=${errorMsg}`);
    }

    // 6. Update password (Mongoose pre-save hook will hash it automatically)
    user.password = password;

    // 7. Clear reset token fields (token is now used/invalid)
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    console.log(`✅ Password reset successful for: ${user.email}`);

    // 8. Redirect to login with success message
    const successMsg = encodeURIComponent('Password reset successful! Please log in with your new password.');
    res.redirect(`/custom-login?success=${successMsg}`);

  } catch (err) {
    console.error('Reset password POST error:', err);
    const errorMsg = encodeURIComponent('An error occurred. Please try again.');
    res.redirect(`/reset-password?token=${token}&error=${errorMsg}`);
  }
});

module.exports = router;
