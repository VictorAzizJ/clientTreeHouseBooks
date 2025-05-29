// routes/dashboard.js
const express      = require('express');
const router       = express.Router();
const Notification = require('../models/Notification');
const Message      = require('../models/Message');
const Announcement = require('../models/Announcement');

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/custom-login');
}

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  const user    = req.session.user;
  const success = req.session.success;
  delete req.session.success;

  let view;
  const data = {};

  // 🔔 1. Load unacknowledged notifications for this role
  const notifications = await Notification.find({
    acknowledgedBy: { $ne: user._id },
    targetRoles:    user.role
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('senderId', 'firstName lastName')
    .lean();
  data.notifications = notifications;

  // Only for staff/admin: load recent messages & announcements
  if (['admin', 'staff'].includes(user.role)) {
    // 💬 2. Recent messages *to* me
    const recentMessages = await Message.find({ recipientId: user._id })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('senderId', 'firstName lastName')
      .lean();
    data.recentMessages = recentMessages;

    // 📢 3. Recent announcements for my role
    const recentAnns = await Announcement.find({
      recipients: user.role
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('sender', 'firstName lastName')
      .lean();
    data.recentAnns = recentAnns;

    // 🔢 4. Aggregate notifications count
    data.notificationsCount = 
      notifications.length + 
      recentMessages.length + 
      recentAnns.length;
  }

  // 👤 Choose template by role
  if (user.role === 'admin') {
    view = 'dashboard-admin';
  } else if (user.role === 'staff') {
    view = 'dashboard-staff';
  } else {
    view = 'dashboard-volunteer';
  }

  // 🚀 Render with all data
  res.render(view, {
    user,
    success,
    ...data
  });
});

module.exports = router;
