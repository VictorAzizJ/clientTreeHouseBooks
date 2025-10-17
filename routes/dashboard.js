// routes/dashboard.js
const express             = require('express');
const router              = express.Router();
const Notification        = require('../models/Notification');
const Message             = require('../models/Message');
const Program             = require('../models/Program');
const Checkout            = require('../models/Checkout');
const Donation            = require('../models/Donation');
const Member              = require('../models/Member');
const Attendee            = require('../models/Attendee');
const DashboardPreference = require('../models/DashboardPreference');
const MetricValue         = require('../models/MetricValue');
const MetricDef           = require('../models/MetricDefinition');

/**
 * Only allow logged-in users to see any dashboard.
 */
function ensureAuthenticated(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect('/custom-login');
}

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  const user    = req.session.user;
  const success = req.session.success;
  delete req.session.success;

  // Load user dashboard preferences
  let prefs = await DashboardPreference.findOne({ user: user._id }).lean();
  if (!prefs) {
    prefs = await DashboardPreference.create({ user: user._id });
    prefs = prefs.toObject();
  }

  // 1. Load notifications (with pagination info)
  const notificationLimit = 10;
  const totalNotifications = await Notification.countDocuments({
    acknowledgedBy: { $ne: user._id },
    targetRoles:    user.role
  });

  const notifications = await Notification.find({
    acknowledgedBy: { $ne: user._id },
    targetRoles:    user.role
  })
    .sort({ createdAt: -1 })
    .limit(notificationLimit)
    .populate('senderId', 'firstName lastName')
    .lean();

  const hasMoreNotifications = totalNotifications > notificationLimit;

  // 2. Load messages & user list (staff/admin only, with pagination info)
  let messages = [], userList = [], hasMoreMessages = false;
  if (['staff','admin'].includes(user.role)) {
    const messageLimit = 10;
    const totalMessages = await Message.countDocuments({
      $or: [
        { senderId:    user._id },
        { recipientId: user._id }
      ]
    });

    messages = await Message.find({
      $or: [
        { senderId:    user._id },
        { recipientId: user._id }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(messageLimit)
      .populate('senderId',    'firstName lastName')
      .populate('recipientId', 'firstName lastName')
      .lean();

    hasMoreMessages = totalMessages > messageLimit;

    userList = await require('../models/User')
      .find({ _id: { $ne: user._id } }, 'firstName lastName role')
      .lean();
  }

  // 3. Count programs (staff/admin only)
  let programCount = 0;
  if (['staff','admin'].includes(user.role)) {
    programCount = await Program.countDocuments();
  }

  // 4. Get metrics summary (staff/admin only)
  let recentMetrics = [];
  if (['staff','admin'].includes(user.role)) {
    // Get recent metric values across all programs
    recentMetrics = await MetricValue.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('program', 'name')
      .populate('definition', 'name type')
      .populate('member', 'firstName lastName')
      .lean();
  }

  // 5. Prepare chart data (admin only)
  let monthLabels = [], checkoutCounts = [], donationCounts = [], memberCounts = [], programStats = [];
  if (user.role === 'admin') {
    const now = new Date();
    // Build 12-month array
    const months = Array.from({ length: 12 }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    );
    monthLabels     = months.map(d => d.toLocaleString('default', { month:'short', year:'numeric' }));
    checkoutCounts  = Array(12).fill(0);
    donationCounts  = Array(12).fill(0);
    memberCounts    = Array(12).fill(0);

    const startDate = months[0];

    // A) Checkouts
    const checkouts = await Checkout.find({ checkoutDate: { $gte: startDate } }).lean();
    checkouts.forEach(c => {
      const d = new Date(c.checkoutDate);
      const idx = months.findIndex(m => m.getFullYear()===d.getFullYear() && m.getMonth()===d.getMonth());
      if (idx >= 0) checkoutCounts[idx]++;
    });

    // B) Donations
    const donations = await Donation.find({ donatedAt: { $gte: startDate } }).lean();
    donations.forEach(d => {
      const dt = new Date(d.donatedAt);
      const idx = months.findIndex(m => m.getFullYear()===dt.getFullYear() && m.getMonth()===dt.getMonth());
      if (idx >= 0) donationCounts[idx]++;
    });

    // C) Member sign-ups
    const members = await Member.find({ joinedAt: { $gte: startDate } }).lean();
    members.forEach(m => {
      const dt = new Date(m.joinedAt);
      const idx = months.findIndex(x => x.getFullYear()===dt.getFullYear() && x.getMonth()===dt.getMonth());
      if (idx >= 0) memberCounts[idx]++;
    });

    // D) Attendees per program
    programStats = await Attendee.aggregate([
      { $group: { _id: '$program', count: { $sum: 1 } } },
      {
        $lookup: {
          from:         'programs',
          localField:   '_id',
          foreignField: '_id',
          as:           'program'
        }
      },
      { $unwind: '$program' },
      { $project: { _id: 0, program: '$program.name', count: 1 } }
    ]);
  }
console.log({ monthLabels, checkoutCounts, donationCounts, memberCounts, programStats })
  // Determine which dashboard template to render
  const templateName = user.role === 'admin' ? 'dashboard-admin'
                     : user.role === 'staff' ? 'dashboard-staff'
                     : 'dashboard-volunteer';

  // Prepare common data
  const dashboardData = {
    user,
    success,
    notifications,
    hasMoreNotifications,
    messages,
    hasMoreMessages,
    userList,
    programCount,
    recentMetrics,
    prefs  // Dashboard preferences
  };

  // Add admin-specific chart data if admin
  if (user.role === 'admin') {
    dashboardData.monthLabels = monthLabels;
    dashboardData.checkoutCounts = checkoutCounts;
    dashboardData.donationCounts = donationCounts;
    dashboardData.memberCounts = memberCounts;
    dashboardData.programStats = programStats;
  }

  return res.render(templateName, dashboardData);
});

module.exports = router;
