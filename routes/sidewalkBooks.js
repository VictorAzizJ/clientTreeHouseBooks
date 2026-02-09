// routes/sidewalkBooks.js
// ═══════════════════════════════════════════════════════════════════════════════
// Unified Sidewalk Inventory Routes
// Handles all four sidewalk categories: Carts, Stacks, Readers, Little Tree House
// All categories share the same formula logic from config/sidewalkFormulas.js
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const SidewalkInventory = require('../models/SidewalkInventory');
const SidewalkBooksWeek = require('../models/SidewalkBooksWeek'); // Legacy model
const {
  SIDEWALK_CATEGORIES,
  FORMULAS,
  getAllCategories,
  getCategory,
  isValidCategory,
  applyFormulas,
  synchronizeWeekData
} = require('../config/sidewalkFormulas');

// Middleware: staff or admin only
function ensureStaffOrAdmin(req, res, next) {
  const role = req.session.user?.role;
  if (role === 'staff' || role === 'admin') return next();
  res.status(403).send('Forbidden');
}

// ─── API ROUTES (must come before :category routes) ─────────────────────────

// GET /sidewalk/api/sync - Check formula synchronization across categories
router.get('/sidewalk/api/sync', ensureStaffOrAdmin, async (req, res) => {
  try {
    // Get latest week records across all categories
    const latestRecords = await SidewalkInventory.getLatestByCategory();

    // Run synchronization check
    const syncResult = synchronizeWeekData(latestRecords);

    // Log any inconsistencies
    if (!syncResult.success) {
      console.warn('Sidewalk formula inconsistencies found:', syncResult.inconsistencies);
    }

    res.json(syncResult);
  } catch (err) {
    console.error('Error checking synchronization:', err);
    res.status(500).json({ success: false, error: 'Synchronization check failed' });
  }
});

// ─── SIDEWALK DASHBOARD ──────────────────────────────────────────────────────

// GET /sidewalk - Main sidewalk dashboard showing all categories
router.get('/sidewalk', ensureStaffOrAdmin, async (req, res) => {
  try {
    // Get latest record for each category
    const latestRecords = await SidewalkInventory.getLatestByCategory();

    // Get category summary stats
    const categorySummary = await SidewalkInventory.getCategorySummary();

    // Map category info to latest records
    const categories = getAllCategories().map(cat => {
      const latest = latestRecords.find(r => r.category === cat.id);
      const summary = categorySummary.find(s => s.category === cat.id);

      return {
        ...cat,
        latest: latest ? {
          ...latest,
          change: FORMULAS.calculateChange(latest.startCount, latest.endCount),
          trend: FORMULAS.determineTrend(latest.startCount, latest.endCount)
        } : null,
        summary: summary || { totalRecords: 0 }
      };
    });

    // Get flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('sidewalkDashboard', {
      user: req.session.user,
      categories,
      success,
      error
    });
  } catch (err) {
    console.error('Error loading sidewalk dashboard:', err);
    res.status(500).send('Error loading data');
  }
});

// ─── CATEGORY-SPECIFIC ROUTES ────────────────────────────────────────────────

// GET /sidewalk/:category - List records for a specific category
router.get('/sidewalk/:category', ensureStaffOrAdmin, async (req, res) => {
  const { category } = req.params;

  if (!isValidCategory(category)) {
    req.session.error = 'Invalid category';
    return res.redirect('/sidewalk');
  }

  try {
    const records = await SidewalkInventory.findByCategory(category);

    // Apply formulas to each record
    records.forEach(record => {
      const calculated = applyFormulas(record);
      Object.assign(record, calculated);
    });

    const categoryInfo = getCategory(category);

    // Get flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('sidewalkCategoryList', {
      user: req.session.user,
      category: categoryInfo,
      records,
      success,
      error
    });
  } catch (err) {
    console.error(`Error fetching ${category} records:`, err);
    res.status(500).send('Error loading data');
  }
});

// GET /sidewalk/:category/new - Show form to add new record
router.get('/sidewalk/:category/new', ensureStaffOrAdmin, (req, res) => {
  const { category } = req.params;

  if (!isValidCategory(category)) {
    req.session.error = 'Invalid category';
    return res.redirect('/sidewalk');
  }

  // Calculate default week (current week)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const categoryInfo = getCategory(category);

  // Get flash messages
  const error = req.session.error;
  delete req.session.error;

  res.render('sidewalkForm', {
    user: req.session.user,
    category: categoryInfo,
    record: null,
    defaultWeekStart: monday.toISOString().split('T')[0],
    defaultWeekEnd: sunday.toISOString().split('T')[0],
    error
  });
});

// GET /sidewalk/:category/:id/edit - Show form to edit existing record
router.get('/sidewalk/:category/:id/edit', ensureStaffOrAdmin, async (req, res) => {
  const { category, id } = req.params;

  if (!isValidCategory(category)) {
    req.session.error = 'Invalid category';
    return res.redirect('/sidewalk');
  }

  try {
    const record = await SidewalkInventory.findById(id).lean();

    if (!record || record.category !== category) {
      req.session.error = 'Record not found';
      return res.redirect(`/sidewalk/${category}`);
    }

    const categoryInfo = getCategory(category);

    // Get flash messages
    const error = req.session.error;
    delete req.session.error;

    res.render('sidewalkForm', {
      user: req.session.user,
      category: categoryInfo,
      record,
      defaultWeekStart: null,
      defaultWeekEnd: null,
      error
    });
  } catch (err) {
    console.error('Error loading record for edit:', err);
    req.session.error = 'Error loading record';
    res.redirect(`/sidewalk/${category}`);
  }
});

// Validation rules for inventory records
const inventoryValidation = [
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

  body('targetCount')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 }).withMessage('Target count must be a non-negative number'),

  body('location')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 }),

  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
];

// POST /sidewalk/:category - Create new record
router.post('/sidewalk/:category', ensureStaffOrAdmin, inventoryValidation, async (req, res) => {
  const { category } = req.params;

  if (!isValidCategory(category)) {
    req.session.error = 'Invalid category';
    return res.redirect('/sidewalk');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.session.error = errors.array()[0].msg;
    return res.redirect(`/sidewalk/${category}/new`);
  }

  const { weekStart, weekEnd, startCount, endCount, targetCount, location, notes } = req.body;

  try {
    // Check for duplicate week in this category
    const existing = await SidewalkInventory.findOne({
      category,
      weekStart: new Date(weekStart)
    });

    if (existing) {
      req.session.error = 'A record for this week already exists in this category';
      return res.redirect(`/sidewalk/${category}/new`);
    }

    await SidewalkInventory.create({
      category,
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd),
      startCount: parseInt(startCount, 10),
      endCount: parseInt(endCount, 10),
      targetCount: targetCount ? parseInt(targetCount, 10) : 50,
      location: location || undefined,
      notes: notes || undefined,
      recordedBy: req.session.user._id
    });

    const categoryInfo = getCategory(category);
    req.session.success = `${categoryInfo.name} record added successfully`;
    res.redirect(`/sidewalk/${category}`);

  } catch (err) {
    console.error('Error creating record:', err);
    req.session.error = 'Failed to create record';
    res.redirect(`/sidewalk/${category}/new`);
  }
});

// POST /sidewalk/:category/:id - Update existing record
router.post('/sidewalk/:category/:id', ensureStaffOrAdmin, inventoryValidation, async (req, res) => {
  const { category, id } = req.params;

  if (!isValidCategory(category)) {
    req.session.error = 'Invalid category';
    return res.redirect('/sidewalk');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.session.error = errors.array()[0].msg;
    return res.redirect(`/sidewalk/${category}/${id}/edit`);
  }

  const { weekStart, weekEnd, startCount, endCount, targetCount, location, notes } = req.body;

  try {
    const record = await SidewalkInventory.findById(id);

    if (!record || record.category !== category) {
      req.session.error = 'Record not found';
      return res.redirect(`/sidewalk/${category}`);
    }

    record.weekStart = new Date(weekStart);
    record.weekEnd = new Date(weekEnd);
    record.startCount = parseInt(startCount, 10);
    record.endCount = parseInt(endCount, 10);
    record.targetCount = targetCount ? parseInt(targetCount, 10) : 50;
    record.location = location || undefined;
    record.notes = notes || undefined;

    await record.save();

    const categoryInfo = getCategory(category);
    req.session.success = `${categoryInfo.name} record updated successfully`;
    res.redirect(`/sidewalk/${category}`);

  } catch (err) {
    console.error('Error updating record:', err);
    req.session.error = 'Failed to update record';
    res.redirect(`/sidewalk/${category}/${id}/edit`);
  }
});

// ─── LEGACY ROUTE SUPPORT ────────────────────────────────────────────────────
// Maintain backwards compatibility with old /sidewalk-books routes

// GET /sidewalk-books - Redirect to new dashboard or show legacy list
router.get('/sidewalk-books', ensureStaffOrAdmin, async (req, res) => {
  try {
    // Try to get records from new model first
    const newRecords = await SidewalkInventory.find().limit(1).lean();

    if (newRecords.length > 0) {
      // New system has data, redirect to new dashboard
      return res.redirect('/sidewalk');
    }

    // Fall back to legacy view with old model data
    const weeks = await SidewalkBooksWeek.find()
      .populate('recordedBy', 'firstName lastName')
      .sort({ weekStart: -1 })
      .limit(100)
      .lean();

    weeks.forEach(week => {
      week.change = week.endCount - week.startCount;
    });

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
    console.error('Error fetching sidewalk books:', err);
    res.status(500).send('Error loading data');
  }
});

// Legacy routes redirect to new category system
router.get('/sidewalk-books/new', (req, res) => res.redirect('/sidewalk/carts/new'));
router.get('/sidewalk-books/:id/edit', async (req, res) => {
  // Try to find in legacy model and redirect appropriately
  res.redirect('/sidewalk');
});

module.exports = router;
