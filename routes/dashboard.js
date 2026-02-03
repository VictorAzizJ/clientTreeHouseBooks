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
const Visit               = require('../models/Visit');
const User                = require('../models/User');

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

  // 3. Get stats for role-specific dashboards
  const stats = {};

  // All roles get total programs and checkouts
  stats.totalPrograms = await Program.countDocuments();
  stats.totalCheckouts = await Checkout.countDocuments();

  // Staff and admin get member counts
  if (['staff','admin'].includes(user.role)) {
    stats.totalMembers = await Member.countDocuments();
  }

  // Only admin gets user counts
  if (user.role === 'admin') {
    stats.totalUsers = await require('../models/User').countDocuments();
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

  // 5. Get recent visits (for optional dashboard widget)
  const visitsLimit = 10;
  const totalVisits = await Visit.countDocuments();
  const recentVisits = await Visit.find()
    .sort({ visitDate: -1 })
    .limit(visitsLimit)
    .populate('member', 'firstName lastName email')
    .lean();
  const hasMoreVisits = totalVisits > visitsLimit;
  stats.totalVisits = totalVisits;

  let programCount = stats.totalPrograms;

  // 6. Prepare chart data (admin only)
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

  // Allow admins to switch between dashboard views
  let templateName;
  const requestedView = req.query.view;

  // Check if front desk mode is active
  if (req.session.frontDeskMode) {
    templateName = 'dashboardFrontDesk';
  } else if (user.role === 'admin' && requestedView) {
    // Admins can view any dashboard
    templateName = requestedView === 'admin' ? 'dashboardAdmin'
                 : requestedView === 'staff' ? 'dashboardStaff'
                 : requestedView === 'volunteer' ? 'dashboardVolunteer'
                 : 'dashboardAdmin'; // Default to admin view for invalid requests
  } else {
    // Normal users see their role-based dashboard
    templateName = user.role === 'admin' ? 'dashboardAdmin'
                 : user.role === 'staff' ? 'dashboardStaff'
                 : 'dashboardVolunteer';
  }

  // Get error message if any
  const error = req.session.error;
  delete req.session.error;

  // Prepare common data
  const dashboardData = {
    user,
    success,
    error,
    stats,  // Stats object for role-specific dashboards
    notifications,
    hasMoreNotifications,
    messages,
    hasMoreMessages,
    userList,
    programCount,
    recentMetrics,
    prefs,  // Dashboard preferences
    recentVisits,
    hasMoreVisits,
    frontDeskMode: req.session.frontDeskMode || false
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

// ─── Front Desk Mode Routes ─────────────────────────────────────────────────

/**
 * POST /front-desk/enter - Enable front desk mode
 * Only staff and admin can enter front desk mode
 */
router.post('/front-desk/enter', ensureAuthenticated, (req, res) => {
  const role = req.session.user?.role;

  if (role !== 'staff' && role !== 'admin') {
    req.session.error = 'Only staff members can enter front desk mode.';
    return res.redirect('/dashboard');
  }

  req.session.frontDeskMode = true;
  req.session.success = 'Front desk mode activated. Access is now limited to essential functions.';
  res.redirect('/dashboard');
});

/**
 * GET /front-desk/exit - Show password form to exit front desk mode
 */
router.get('/front-desk/exit', ensureAuthenticated, (req, res) => {
  if (!req.session.frontDeskMode) {
    return res.redirect('/dashboard');
  }

  const error = req.session.error;
  delete req.session.error;

  res.render('frontDeskExit', {
    user: req.session.user,
    error
  });
});

/**
 * POST /front-desk/exit - Verify password and exit front desk mode
 */
router.post('/front-desk/exit', ensureAuthenticated, async (req, res) => {
  if (!req.session.frontDeskMode) {
    return res.redirect('/dashboard');
  }

  const { password } = req.body;

  if (!password) {
    req.session.error = 'Password is required to exit front desk mode.';
    return res.redirect('/front-desk/exit');
  }

  try {
    // Find the current user and verify password
    const user = await User.findById(req.session.user._id);

    if (!user) {
      req.session.error = 'User not found. Please log in again.';
      return res.redirect('/logout');
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      req.session.error = 'Incorrect password. Please try again.';
      return res.redirect('/front-desk/exit');
    }

    // Password verified - exit front desk mode
    req.session.frontDeskMode = false;
    req.session.success = 'Front desk mode deactivated. Full access restored.';
    res.redirect('/dashboard');

  } catch (err) {
    console.error('Error exiting front desk mode:', err);
    req.session.error = 'An error occurred. Please try again.';
    res.redirect('/front-desk/exit');
  }
});

module.exports = router;
