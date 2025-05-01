const express = require('express'); 
const router = express.Router();
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const User = require('../models/User');

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

  // 🔔 Load unacknowledged notifications for this role
  const notifications = await Notification.find({
    acknowledgedBy: { $ne: user._id },
    targetRoles: user.role
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('senderId', 'firstName lastName')
    .lean();
  extraData.notifications = notifications;

  // 💬 Load messages and user list for staff/admin
  if (['admin', 'staff'].includes(user.role)) {
    const messages = await Message.find({
      $or: [
        { senderId: user._id },
        { recipientId: user._id }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('senderId', 'firstName lastName')
      .populate('recipientId', 'firstName lastName')
      .lean();

    const userList = await User.find(
      { role: { $in: ['admin', 'staff'] } },
      'firstName lastName role'
    ).lean();

    extraData.messages = messages;
    extraData.userList = userList;
  }

  // 👤 Set view based on role
  if (user.role === 'admin') {
    view = 'dashboard-admin';
  } else if (user.role === 'staff') {
    view = 'dashboard-staff';
  } else {
    view = 'dashboard-volunteer';
  }

  // 📦 Render view with data
  res.render(view, { user, success, ...extraData });
});

module.exports = router;
