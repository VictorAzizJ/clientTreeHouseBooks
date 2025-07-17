// routes/programs.js
const express   = require('express');
const router    = express.Router();
const Program   = require('../models/Program');
const Attendee  = require('../models/Attendee');
const Attendance= require('../models/Attendance');
const MetricDef = require('../models/MetricDefinition');
const MetricVal = require('../models/MetricValue');

function ensureAuthenticated(req, res, next) {
  if (req.session?.user && ['admin','staff'].includes(req.session.user.role)) {
    return next();
  }
  res.redirect('/custom-login');
}

// ── 1. List Programs ───────────────────────────────────────
router.get('/programs', ensureAuthenticated, async (req, res) => {
  const programs = await Program.find().lean();
  res.render('programsList', {
    user: req.session.user,
    programs
  });
});

// ── 2. New Program Form ───────────────────────────────────
router.get('/programs/new', ensureAuthenticated, (req, res) => {
  res.render('newProgram', { user: req.session.user });
});

// ── 3. Create Program ─────────────────────────────────────
router.post('/programs', ensureAuthenticated, async (req, res) => {
  const { name, description } = req.body;
  await Program.create({ name, description });
  req.session.success = 'Program created';
  res.redirect('/programs');
});

// ── 4. Program Details (Attendees / Attendance / Metrics) ─
router.get('/programs/:id', ensureAuthenticated, async (req, res) => {
  const program = await Program.findById(req.params.id).lean();

  // List attendees
  const attendees = await Attendee.find({ program: program._id }).lean();

  // List metric definitions
  const metrics = await MetricDef.find({ program: program._id }).lean();

  res.render('programDetails', {
    user:      req.session.user,
    program,
    attendees,
    metrics
  });
});

module.exports = router;
