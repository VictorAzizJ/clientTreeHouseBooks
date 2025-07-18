// routes/dashboard.js

const express      = require('express');
const router       = express.Router();
const Notification = require('../models/Notification');
const Message      = require('../models/Message');
const Program      = require('../models/Program');
const User         = require('../models/User');
const Checkout     = require('../models/Checkout');
const Donation     = require('../models/Donation');
const Member       = require('../models/Member');
const Attendee     = require('../models/Attendee');

/**
 * Middleware to ensure the user is logged in.
 */
function ensureStaffOrAdmin(req, res, next) {
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
router.get('/dashboard', ensureStaffOrAdmin, async (req, res) => {
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

  
  let monthLabels = [], checkoutCounts = [], donationCounts = [], memberCounts = [], programStats = [];
  if (user.role === 'admin') {
    // 12 monthly buckets ending this month
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d);
    }
    monthLabels = months.map(d => d.toLocaleString('default', { month: 'short', year: 'numeric' }));
    // zero arrays
    checkoutCounts = Array(12).fill(0);
    donationCounts = Array(12).fill(0);
    memberCounts   = Array(12).fill(0);

    const startDate = months[0];

    // 1) Checkouts in last 12 months
    const checkouts = await Checkout.find({ checkoutDate: { $gte: startDate } }).lean();
    checkouts.forEach(c => {
      const d = new Date(c.checkoutDate);
      const idx = months.findIndex(m => m.getFullYear() === d.getFullYear() && m.getMonth() === d.getMonth());
      if (idx >= 0) checkoutCounts[idx]++;
    });

    // 2) Donations
    const donations = await Donation.find({ donatedAt: { $gte: startDate } }).lean();
    donations.forEach(d => {
      const dt = new Date(d.donatedAt);
      const idx = months.findIndex(m => m.getFullYear() === dt.getFullYear() && m.getMonth() === dt.getMonth());
      if (idx >= 0) donationCounts[idx]++;
    });

    // 3) Member sign-ups (joinedAt)
    const members = await Member.find({ joinedAt: { $gte: startDate } }).lean();
    members.forEach(m => {
      const dt = new Date(m.joinedAt);
      const idx = months.findIndex(x => x.getFullYear() === dt.getFullYear() && x.getMonth() === dt.getMonth());
      if (idx >= 0) memberCounts[idx]++;
    });

    // 4) Attendees per program
    const agg = await Attendee.aggregate([
      { $group: { _id: '$program', count: { $sum: 1 } } },
      {
        $lookup: {
          from:     'programs',
          localField:  '_id',
          foreignField: '_id',
          as:       'program'
        }
      },
      { $unwind: '$program' },
      { $project: { _id: 0, program: '$program.name', count: 1 } }
    ]);
    programStats = agg; // array of { program, count }
  }


  // Render with everything the EJS needs
  res.render(view, {
    user,
    success,
    notifications,
    messages,
    userList,
    programCount,
    monthLabels,
    checkoutCounts,
    donationCounts,
    memberCounts,
    programStats
  });
});

module.exports = router;

