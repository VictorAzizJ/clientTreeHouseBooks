// src/routes/adminUsers.js
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { ensureAdmin } = require('./_middleware');

// 1) List all users
router.get('/admin/users', ensureAdmin, async (req, res) => {
  const users = await User.find().sort('firstName lastName').lean();
  res.render('adminUsersList', {
    user:  req.session.user,
    users
  });
});

// 2) Edit form
router.get('/admin/users/:id/edit', ensureAdmin, async (req, res) => {
  const u = await User.findById(req.params.id).lean();
  if (!u) return res.status(404).send('User not found');
  res.render('adminUserEdit', {
    user: req.session.user,
    u, 
    roles: ['volunteer','staff','admin']
  });
});

// 3) Handle update
router.post('/admin/users/:id', ensureAdmin, async (req, res) => {
  const { role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { role });
  req.session.success = 'User role updated';
  res.redirect('/admin/users');
});

module.exports = router;
