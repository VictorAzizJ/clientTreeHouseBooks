// routes/bookDistribution.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const BookDistribution = require('../models/BookDistribution');

// Middleware: staff or admin only
function ensureStaffOrAdmin(req, res, next) {
  const role = req.session.user?.role;
  if (role === 'staff' || role === 'admin') return next();
  res.status(403).send('Forbidden');
}

// GET /book-distribution - List all distributions
router.get('/book-distribution', ensureStaffOrAdmin, async (req, res) => {
  try {
    const distributions = await BookDistribution.find()
      .populate('recordedBy', 'firstName lastName')
      .sort({ eventDate: -1 })
      .limit(100)
      .lean();

    // Get flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('bookDistributionList', {
      user: req.session.user,
      distributions,
      success,
      error
    });
  } catch (err) {
    console.error('Error fetching distributions:', err);
    res.status(500).send('Error loading distributions');
  }
});

// GET /book-distribution/new - Show form
router.get('/book-distribution/new', ensureStaffOrAdmin, (req, res) => {
  // Get flash messages
  const success = req.session.success;
  const error = req.session.error;
  delete req.session.success;
  delete req.session.error;

  res.render('newBookDistribution', {
    user: req.session.user,
    success,
    error
  });
});

// POST /book-distribution - Create distribution record
router.post(
  '/book-distribution',
  ensureStaffOrAdmin,
  [
    body('location')
      .trim()
      .notEmpty().withMessage('Location is required')
      .isLength({ max: 200 }),

    body('eventName')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 200 }),

    body('eventDate')
      .optional({ checkFalsy: true })
      .isISO8601().withMessage('Invalid date format'),

    // Book category quantities
    body('bookCategories.blackAuthorAdult.quantity').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('bookCategories.blackAuthorAdult.weight').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('bookCategories.adult.quantity').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('bookCategories.adult.weight').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('bookCategories.blackAuthorKids.quantity').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('bookCategories.blackAuthorKids.weight').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('bookCategories.kids.quantity').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('bookCategories.kids.weight').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('bookCategories.boardBooks.quantity').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('bookCategories.boardBooks.weight').optional({ checkFalsy: true }).isFloat({ min: 0 }),

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
      return res.redirect('/book-distribution/new');
    }

    const { location, eventName, eventDate, bookCategories, notes } = req.body;

    try {
      const distributionData = {
        location,
        eventName: eventName || undefined,
        eventDate: eventDate ? new Date(eventDate) : new Date(),
        bookCategories: {
          blackAuthorAdult: {
            quantity: parseInt(bookCategories?.blackAuthorAdult?.quantity) || 0,
            weight: parseFloat(bookCategories?.blackAuthorAdult?.weight) || 0
          },
          adult: {
            quantity: parseInt(bookCategories?.adult?.quantity) || 0,
            weight: parseFloat(bookCategories?.adult?.weight) || 0
          },
          blackAuthorKids: {
            quantity: parseInt(bookCategories?.blackAuthorKids?.quantity) || 0,
            weight: parseFloat(bookCategories?.blackAuthorKids?.weight) || 0
          },
          kids: {
            quantity: parseInt(bookCategories?.kids?.quantity) || 0,
            weight: parseFloat(bookCategories?.kids?.weight) || 0
          },
          boardBooks: {
            quantity: parseInt(bookCategories?.boardBooks?.quantity) || 0,
            weight: parseFloat(bookCategories?.boardBooks?.weight) || 0
          }
        },
        notes: notes || undefined,
        recordedBy: req.session.user._id
      };

      // Calculate totals for validation
      const totalBooks =
        distributionData.bookCategories.blackAuthorAdult.quantity +
        distributionData.bookCategories.adult.quantity +
        distributionData.bookCategories.blackAuthorKids.quantity +
        distributionData.bookCategories.kids.quantity +
        distributionData.bookCategories.boardBooks.quantity;

      if (totalBooks < 1) {
        req.session.error = 'Please enter at least one book';
        return res.redirect('/book-distribution/new');
      }

      await BookDistribution.create(distributionData);

      req.session.success = 'Book distribution recorded successfully';
      res.redirect('/book-distribution');

    } catch (err) {
      console.error('Error recording distribution:', err);
      req.session.error = 'Failed to record distribution';
      res.redirect('/book-distribution/new');
    }
  }
);

module.exports = router;
