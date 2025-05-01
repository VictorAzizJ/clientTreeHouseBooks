// routes/dashboard.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// Middleware to ensure user is logged in
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/custom-login');
}

// GET /dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  const user = req.session.user;
  const success = req.session.success;
  delete req.session.success;

  let view;
  let extraData = {};

  if (user.role === 'admin') {
    view = 'dashboard-admin';
  } else if (user.role === 'staff') {
    view = 'dashboard-staff';
  } else {
    view = 'dashboard-volunteer';

    // Load unacknowledged notifications
    const notifications = await Notification.find({
      acknowledgedBy: { $ne: user._id }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('senderId', 'firstName lastName')
      .lean();

    extraData.notifications = notifications;
  }

  res.render(view, { user, success, ...extraData });
});