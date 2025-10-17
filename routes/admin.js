// routes/admin.js
const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const User    = require('../models/User');
const { sendPasswordResetEmail } = require('../services/mailer');

// Middleware to ensure only admins can hit these routes
function ensureAdmin(req, res, next) {
  if (req.session?.user?.role === 'admin') {
    return next();
  }
  return res.status(403).send("Forbidden: You are not an admin");
}

// GET /admin/users — list everyone
router.get('/admin/users', ensureAdmin, async (req, res, next) => {
  try {
    const users   = await User.find().lean();
    const success = req.session.success;
    delete req.session.success;
    res.render('adminUsers', {
      currentUser: req.session.user,
      users,
      success
    });
  } catch (err) {
    next(err);
  }
});

// POST /admin/users/:id — change one user’s role
router.post('/admin/users/:id', ensureAdmin, async (req, res, next) => {
  try {
    const userId  = req.params.id;
    const newRole = req.body.role; // "volunteer", "staff", or "admin"

    // 1) Update in the database
    const updated = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true, lean: true }
    );
    if (!updated) {
      req.session.success = 'User not found';
      return res.redirect('/admin/users');
    }

    // 2) If *you* changed *your own* role, sync your session immediately
    const meId = req.session.user._id.toString();
    if (meId === updated._id.toString()) {
      req.session.user.role = updated.role;
      // Flash a quick message and send you to your dashboard
      req.session.success = 'Your role has been updated—enjoy your new dashboard!';
      return res.redirect('/dashboard');
    }

    // 3) Otherwise, flash and go back to Manage Users
    req.session.success = `${updated.email || updated.firstName} is now a ${updated.role}`;
    res.redirect('/admin/users');

  } catch (err) {
    next(err);
  }
});

// ─── POST /admin/users/:id/reset-password ────────────────────────────────────
// Admin-initiated password reset: generates reset token and sends email to user
//
// FLOW:
// 1. Admin clicks "Reset Password" button on adminUsers page
// 2. Server generates reset token (same as forgot-password flow)
// 3. Server sends password reset email to the user
// 4. User clicks link in email and follows normal reset-password flow
//
// NOTE: This does NOT set a temporary password - it uses the same secure
// email-based reset flow that users can self-initiate via /forgot-password
router.post('/admin/users/:id/reset-password', ensureAdmin, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // 1. Find the user
    const user = await User.findById(userId);
    if (!user) {
      req.session.success = 'User not found';
      return res.redirect('/admin/users');
    }

    // 2. Generate reset token (same as forgot-password)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // 3. Save token to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = tokenExpiry;
    await user.save();

    // 4. Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.firstName);
      req.session.success = `Password reset email sent to ${user.email}`;
      console.log(`✅ Admin-initiated password reset for: ${user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      // Clear token if email fails
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();

      req.session.success = 'Failed to send reset email. Please ensure email is configured.';
    }

    res.redirect('/admin/users');

  } catch (err) {
    next(err);
  }
});

module.exports = router;


