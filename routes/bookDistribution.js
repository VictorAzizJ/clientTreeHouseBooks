// routes/bookDistribution.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const BookDistribution = require('../models/BookDistribution');
const Member = require('../models/Member');
const Organization = require('../models/Organization');

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
    body('recipientType')
      .trim()
      .notEmpty().withMessage('Recipient type is required')
      .isIn(['member', 'organization']).withMessage('Recipient type must be member or organization'),

    body('memberId')
      .optional({ checkFalsy: true })
      .isMongoId().withMessage('Invalid member ID'),

    body('organizationId')
      .optional({ checkFalsy: true })
      .isMongoId().withMessage('Invalid organization ID'),

    body('eventName')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 200 }),

    body('eventDate')
      .optional({ checkFalsy: true })
      .isISO8601().withMessage('Invalid date format'),

    body('totalBooks')
      .trim()
      .notEmpty().withMessage('Total books is required')
      .isInt({ min: 1, max: 100000 }).withMessage('Total books must be between 1 and 100,000'),

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

    const { recipientType, memberId, organizationId, eventName, eventDate, totalBooks, notes } = req.body;

    // Validate recipient is provided based on type
    if (recipientType === 'member' && !memberId) {
      req.session.error = 'Please select a person';
      return res.redirect('/book-distribution/new');
    }
    if (recipientType === 'organization' && !organizationId) {
      req.session.error = 'Please select an organization';
      return res.redirect('/book-distribution/new');
    }

    try {
      // Build location string from recipient name for backward compatibility
      let locationName = '';
      if (recipientType === 'member' && memberId) {
        const member = await Member.findById(memberId).lean();
        if (member) {
          locationName = `${member.firstName} ${member.lastName}`;
        }
      } else if (recipientType === 'organization' && organizationId) {
        const org = await Organization.findById(organizationId).lean();
        if (org) {
          locationName = org.name;
        }
      }

      const distributionData = {
        recipientType,
        member: memberId || undefined,
        organization: organizationId || undefined,
        location: locationName,  // For backward compatibility
        eventName: eventName || undefined,
        eventDate: eventDate ? new Date(eventDate) : new Date(),
        totalBooks: parseInt(totalBooks, 10),
        notes: notes || undefined,
        recordedBy: req.session.user._id
      };

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
