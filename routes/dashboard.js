// routes/dashboard.js
const express      = require('express');
const router       = express.Router();
const Notification = require('../models/Notification');
const Message      = require('../models/Message');
const Program      = require('../models/Program');
const Checkout     = require('../models/Checkout');
const Donation     = require('../models/Donation');
const Member       = require('../models/Member');
const Attendee     = require('../models/Attendee');

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

  // 1. Load notifications
  const notifications = await Notification.find({
    acknowledgedBy: { $ne: user._id },
    targetRoles:    user.role
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('senderId', 'firstName lastName')
    .lean();

  // 2. Load messages & user list (staff/admin only)
  let messages = [], userList = [];
  if (['staff','admin'].includes(user.role)) {
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

    userList = await require('../models/User')
      .find({ _id: { $ne: user._id } }, 'firstName lastName role')
      .lean();
  }

  // 3. Count programs (staff/admin only)
  let programCount = 0;
  if (['staff','admin'].includes(user.role)) {
    programCount = await Program.countDocuments();
  }

  // Prepare chart data (admin only)
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
  // Render with exactly those five arrays for Chart.js:
  return res.render('dashboard-admin', {
    user,
    success,
    notifications,
    messages,
    userList,
    programCount,

    // chart arrays:
    monthLabels,
    checkoutCounts,
    donationCounts,
    memberCounts,
    programStats
  });
});

module.exports = router;
