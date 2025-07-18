// src/routes/programs.js
const express         = require('express');
const router          = express.Router();
const Program         = require('../models/Program');
const Attendee        = require('../models/Attendee');
const Attendance      = require('../models/Attendance');
const MetricDef       = require('../models/MetricDefinition');
const MetricVal       = require('../models/MetricValue');
const { ensureStaffOrAdmin } = require('./_middleware');

/**
 * GET /programs
 * List all programs
 */
router.get('/programs', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const programs = await Program.find().lean();
    res.render('programsList', {
      user: req.session.user,
      programs
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /programs/new
 * Form to create a new program
 */
router.get('/programs/new', ensureStaffOrAdmin, (req, res) => {
  res.render('newProgram', {
    user: req.session.user
  });
});

/**
 * POST /programs
 * Create a new program and redirect back to list
 */
router.post('/programs', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    await Program.create(req.body);
    req.session.success = 'Program created';
    res.redirect('/programs');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /programs/:id
 * Show program details, attendees, attendance & metrics definitions
 */
router.get('/programs/:id', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    // 1. Flash success message (if any)
    const success = req.session.success;
    delete req.session.success;

    // 2. Load program
    const program = await Program.findById(req.params.id).lean();
    if (!program) {
      return res.status(404).render('404', { user: req.session.user });
    }

    // 3. Load related data
    const attendees   = await Attendee.find({ program: program._id }).lean();
    const attendance  = await Attendance.find({ program: program._id }).lean();
    const definitions = await MetricDef.find({ program: program._id }).lean();

    // 4. Render the detail view
    res.render('programDetails', {
      success,
      user:        req.session.user,
      program,
      attendees,
      attendance,
      definitions,
      today: new Date().toISOString().slice(0,10)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
