const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/custom-login');
}

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  const user = req.session.user;
  const success = req.session.success;
  delete req.session.success;

  let view;
  let extraData = {};

  // Load unacknowledged notifications for this role
  const notifications = await Notification.find({
    acknowledgedBy: { $ne: user._id },
    targetRoles: user.role
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('senderId', 'firstName lastName')
    .lean();

  extraData.notifications = notifications;

  // Set view
  if (user.role === 'admin') {
    view = 'dashboard-admin';
  } else if (user.role === 'staff') {
    view = 'dashboard-staff';
  } else {
    view = 'dashboard-volunteer';
  }

  // Send it all to EJS
  res.render(view, { user, success, ...extraData });
});


module.exports = router;
