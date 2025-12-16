// routes/sidewalkBooks.js
// ═══════════════════════════════════════════════════════════════════════════════
// Sidewalk Books Program - Weekly Inventory Tracking Routes
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const SidewalkBooksWeek = require('../models/SidewalkBooksWeek');

// Middleware: staff or admin only
function ensureStaffOrAdmin(req, res, next) {
  const role = req.session.user?.role;
  if (role === 'staff' || role === 'admin') return next();
  res.status(403).send('Forbidden');
}

// GET /sidewalk-books - List all weekly records
router.get('/sidewalk-books', ensureStaffOrAdmin, async (req, res) => {
  try {
    const weeks = await SidewalkBooksWeek.find()
      .populate('recordedBy', 'firstName lastName')
      .sort({ weekStart: -1 })
      .limit(100)
      .lean();

    // Calculate change for each week
    weeks.forEach(week => {
      week.change = week.endCount - week.startCount;
    });

    // Get flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('sidewalkBooksList', {
      user: req.session.user,
      weeks,
      success,
      error
    });
  } catch (err) {
    console.error('Error fetching sidewalk books weeks:', err);
    res.status(500).send('Error loading data');
  }
});

// GET /sidewalk-books/new - Show form to add new week
router.get('/sidewalk-books/new', ensureStaffOrAdmin, (req, res) => {
  // Get flash messages
  const success = req.session.success;
  const error = req.session.error;
  delete req.session.success;
  delete req.session.error;

  // Calculate default week (current week)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  res.render('sidewalkBooksForm', {
    user: req.session.user,
    week: null,
    defaultWeekStart: monday.toISOString().split('T')[0],
    defaultWeekEnd: sunday.toISOString().split('T')[0],
    success,
    error
  });
});

// GET /sidewalk-books/:id/edit - Show form to edit existing week
router.get('/sidewalk-books/:id/edit', ensureStaffOrAdmin, async (req, res) => {
  try {
    const week = await SidewalkBooksWeek.findById(req.params.id).lean();
    if (!week) {
      req.session.error = 'Week not found';
      return res.redirect('/sidewalk-books');
    }

    // Get flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('sidewalkBooksForm', {
      user: req.session.user,
      week,
      defaultWeekStart: null,
      defaultWeekEnd: null,
      success,
      error
    });
  } catch (err) {
    console.error('Error loading week for edit:', err);
    req.session.error = 'Error loading week';
    res.redirect('/sidewalk-books');
  }
});

// POST /sidewalk-books - Create new week record
router.post(
  '/sidewalk-books',
  ensureStaffOrAdmin,
  [
    body('weekStart')
      .notEmpty().withMessage('Week start date is required')
      .isISO8601().withMessage('Invalid date format'),

    body('weekEnd')
      .notEmpty().withMessage('Week end date is required')
      .isISO8601().withMessage('Invalid date format'),

    body('startCount')
      .trim()
      .notEmpty().withMessage('Start count is required')
      .isInt({ min: 0 }).withMessage('Start count must be a non-negative number'),

    body('endCount')
      .trim()
      .notEmpty().withMessage('End count is required')
      .isInt({ min: 0 }).withMessage('End count must be a non-negative number'),

    body('notes')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 1000 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      req.session.error = firstError;
      return res.redirect('/sidewalk-books/new');
    }

    const { weekStart, weekEnd, startCount, endCount, notes } = req.body;

    try {
      // Check for duplicate week
      const existing = await SidewalkBooksWeek.findOne({
        weekStart: new Date(weekStart)
      });

      if (existing) {
        req.session.error = 'A record for this week already exists';
        return res.redirect('/sidewalk-books/new');
      }

      await SidewalkBooksWeek.create({
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        startCount: parseInt(startCount, 10),
        endCount: parseInt(endCount, 10),
        notes: notes || undefined,
        recordedBy: req.session.user._id
      });

      req.session.success = 'Weekly record added successfully';
      res.redirect('/sidewalk-books');

    } catch (err) {
      console.error('Error creating sidewalk books week:', err);
      req.session.error = 'Failed to create record';
      res.redirect('/sidewalk-books/new');
    }
  }
);

// PUT /sidewalk-books/:id - Update existing week record
router.post(
  '/sidewalk-books/:id',
  ensureStaffOrAdmin,
  [
    body('weekStart')
      .notEmpty().withMessage('Week start date is required')
      .isISO8601().withMessage('Invalid date format'),

    body('weekEnd')
      .notEmpty().withMessage('Week end date is required')
      .isISO8601().withMessage('Invalid date format'),

    body('startCount')
      .trim()
      .notEmpty().withMessage('Start count is required')
      .isInt({ min: 0 }).withMessage('Start count must be a non-negative number'),

    body('endCount')
      .trim()
      .notEmpty().withMessage('End count is required')
      .isInt({ min: 0 }).withMessage('End count must be a non-negative number'),

    body('notes')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 1000 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      req.session.error = firstError;
      return res.redirect(`/sidewalk-books/${req.params.id}/edit`);
    }

    const { weekStart, weekEnd, startCount, endCount, notes } = req.body;

    try {
      const week = await SidewalkBooksWeek.findById(req.params.id);
      if (!week) {
        req.session.error = 'Week not found';
        return res.redirect('/sidewalk-books');
      }

      week.weekStart = new Date(weekStart);
      week.weekEnd = new Date(weekEnd);
      week.startCount = parseInt(startCount, 10);
      week.endCount = parseInt(endCount, 10);
      week.notes = notes || undefined;

      await week.save();

      req.session.success = 'Weekly record updated successfully';
      res.redirect('/sidewalk-books');

    } catch (err) {
      console.error('Error updating sidewalk books week:', err);
      req.session.error = 'Failed to update record';
      res.redirect(`/sidewalk-books/${req.params.id}/edit`);
    }
  }
);

module.exports = router;
