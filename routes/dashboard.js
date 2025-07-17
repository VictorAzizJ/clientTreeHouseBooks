// routes/dashboard.js

const express      = require('express');
const router       = express.Router();
const Notification = require('../models/Notification');
const Message      = require('../models/Message');
const Program      = require('../models/Program');
const User         = require('../models/User');

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
 * - Load unacknowledged notifications
 * - If staff/admin: load recent messages & user list
 * - Render the correct dashboard view based on role
 */
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  const user    = req.session.user;    // from login
  const success = req.session.success; // optional flash
  delete req.session.success;

  // 1️⃣ Notifications for this user's role
  const notifications = await Notification.find({
    acknowledgedBy: { $ne: user._id },
    targetRoles:    user.role
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('senderId', 'firstName lastName')
    .lean();

  // Prepare messages and userList for staff/admin
  let messages = [];
  let userList = [];

  if (['admin', 'staff'].includes(user.role)) {
    // 2️⃣ Recent messages (sent to **or** from me)
    messages = await Message.find({
      $or: [
        { senderId:    user._id },
        { recipientId: user._id }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('senderId',    'firstName lastName')
      .populate('recipientId', 'firstName lastName')
      .lean();

    // 3️⃣ Build the dropdown list of other users
    userList = await User.find(
      { _id: { $ne: user._id } },
      'firstName lastName role'
    )
    .lean();
  }

  // Pick the right view
  let view;
  if (user.role === 'admin') {
    view = 'dashboard-admin';
  } else if (user.role === 'staff') {
    view = 'dashboard-staff';
  } else {
    view = 'dashboard-volunteer';
  }

    // 3) Count total programs
  let programCount = 0;
  if (['admin','staff'].includes(user.role)) {
    programCount = await Program.countDocuments();
  }

  // Render with everything the EJS needs
  res.render(view, {
    user,
    success,
    notifications,
    messages,
    userList,
    programCount
  });
});

module.exports = router;

