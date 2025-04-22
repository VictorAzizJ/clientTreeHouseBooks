// routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to ensure admin privileges
function ensureAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).send("Forbidden: You are not an admin");
}

// GET /admin/users: List all users with a management interface
router.get('/admin/users', ensureAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    res.render('adminUsers', { users, currentUser: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving users");
  }
});

// POST /admin/users/:id: Update a user's role
router.post('/admin/users/:id', ensureAdmin, async (req, res) => {
  const { role } = req.body; // role should be "volunteer", "staff", or "admin"
  const userId = req.params.id;
  try {
    await User.findByIdAndUpdate(userId, { role });
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating user role");
  }
});

module.exports = router;
