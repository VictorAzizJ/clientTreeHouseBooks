// routes/admin.js
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');

// Middleware to ensure admin privileges
function ensureAdmin(req, res, next) {
  if (req.session?.user?.role === 'admin') {
    return next();
  }
  return res.status(403).send("Forbidden: You are not an admin");
}

/**
 * GET /admin/users
 * List all users and show any flash success.
 */
router.get('/admin/users', ensureAdmin, async (req, res, next) => {
  try {
    const users   = await User.find().lean();
    const success = req.session.success;
    delete req.session.success;          // clear flash

    res.render('adminUsers', {
      currentUser: req.session.user,
      users,
      success                           // pass in flash message
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/users/:id
 * Update a user's role. If you just updated your own role,
 * update your session immediately so your dashboard view changes.
 */
router.post('/admin/users/:id', ensureAdmin, async (req, res, next) => {
  try {
    const userId  = req.params.id;
    const newRole = req.body.role;      // "volunteer", "staff", or "admin"

    // 1) Update in DB and get the updated document
    const updated = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true, lean: true }
    );
    if (!updated) {
      req.session.success = `User not found`;
      return res.redirect('/admin/users');
    }

    // 2) If *you* changed *your own* role, sync your session
    if (req.session.user._id === updated._id.toString()) {
      req.session.user.role = updated.role;
    }

    // 3) Set flash & redirect back to list
    req.session.success = 'User role updated';
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

