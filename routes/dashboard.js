// routes/dashboard.js

const express      = require('express');
const router       = express.Router();
const Notification = require('../models/Notification');
const Message      = require('../models/Message');
const Announcement = require('../models/Announcement');

/**
 * Middleware to ensure the user is logged in.
 */
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/custom-login');
}

/**
 * GET /dashboard
 * Load notifications, recent messages & announcements (for staff/admin),
 * then render the correct dashboard view based on role.
 */
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  const user    = req.session.user;        // from login flow
  const success = req.session.success;     // flash message (optional)
  delete req.session.success;

  let view;
  const data = {};

  // 1️⃣ Load up to 5 unacknowledged Notifications for this user's role
  const notifications = await Notification.find({
    acknowledgedBy: { $ne: user._id },
    targetRoles:    user.role
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('senderId', 'firstName lastName')
    .lean();
  data.notifications = notifications;

  // Only for staff/admin users, also load Messages & Announcements
  if (['admin', 'staff'].includes(user.role)) {
    // 2️⃣ Fetch the 3 most recent Messages sent *to* this user
    const recentMessages = await Message.find({ recipientId: user._id })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('senderId', 'firstName lastName')
      .lean();
    data.recentMessages = recentMessages;

    // 3️⃣ Fetch the 3 most recent Announcements targeted at this role
    const recentAnns = await Announcement.find({
      recipients: user.role
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('sender', 'firstName lastName')
      .lean();
    data.recentAnns = recentAnns;

    // 4️⃣ Total up all “new items” for the top-left badge
    data.notificationsCount =
      notifications.length +
      recentMessages.length +
      recentAnns.length;
  }

  // Choose which dashboard template to render
  if (user.role === 'admin') {
    view = 'dashboard-admin';
  } else if (user.role === 'staff') {
    view = 'dashboard-staff';
  } else {
    view = 'dashboard-volunteer';
  }

  // Render with user, any flash success, and our fetched data
  res.render(view, {
    user,
    success,
    ...data
  });
});

module.exports = router;
