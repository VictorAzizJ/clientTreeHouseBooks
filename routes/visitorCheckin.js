// routes/visitorCheckin.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Member = require('../models/Member');
const Visit = require('../models/Visit');

// Middleware: authenticated users
function ensureAuthenticated(req, res, next) {
  if (req.session?.user) {
    return next();
  }
  return res.status(403).send('Forbidden');
}

// GET /visitor-checkin - Show the visitor check-in form
router.get('/visitor-checkin', ensureAuthenticated, async (req, res) => {
  // Get flash messages
  const success = req.session.success;
  const error = req.session.error;
  delete req.session.success;
  delete req.session.error;

  res.render('visitorCheckin', {
    user: req.session.user,
    success,
    error
  });
});

// POST /visitor-checkin - Process visitor check-in
router.post(
  '/visitor-checkin',
  ensureAuthenticated,
  [
    // For existing member
    body('memberId')
      .optional({ checkFalsy: true })
      .isMongoId().withMessage('Invalid member ID'),

    // For new visitor
    body('firstName')
      .if((value, { req }) => !req.body.memberId)
      .trim()
      .notEmpty().withMessage('First name is required for new visitors'),

    body('lastName')
      .if((value, { req }) => !req.body.memberId)
      .trim()
      .notEmpty().withMessage('Last name is required for new visitors'),

    body('email')
      .optional({ checkFalsy: true })
      .trim()
      .isEmail().withMessage('Must be a valid email address')
      .normalizeEmail(),

    body('purpose')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 }),

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
      return res.redirect('/visitor-checkin');
    }

    const { memberId, firstName, lastName, email, purpose, notes } = req.body;

    try {
      let member;

      if (memberId) {
        // Existing member check-in
        member = await Member.findById(memberId);
        if (!member) {
          req.session.error = 'Member not found';
          return res.redirect('/visitor-checkin');
        }
      } else {
        // New visitor - check if they already exist by email
        if (email) {
          member = await Member.findOne({ email: email.toLowerCase() });
        }

        if (!member) {
          // Create new member
          member = await Member.create({
            firstName,
            lastName,
            email: email || undefined,
            memberType: 'adult'
          });
        }
      }

      // Create visit record
      await Visit.create({
        member: member._id,
        visitDate: new Date(),
        purpose: purpose || undefined,
        notes: notes || undefined,
        recordedBy: req.session.user._id
      });

      req.session.success = `Welcome, ${member.firstName}! Check-in recorded.`;
      res.redirect('/visitor-checkin');

    } catch (err) {
      console.error('Error recording visitor check-in:', err);
      req.session.error = 'Failed to record check-in';
      res.redirect('/visitor-checkin');
    }
  }
);

// GET /api/visits/recent - Get recent visits (for dashboard widgets)
router.get('/api/visits/recent', ensureAuthenticated, async (req, res) => {
  try {
    const visits = await Visit.find()
      .populate('member', 'firstName lastName email')
      .sort({ visitDate: -1 })
      .limit(20)
      .lean();

    res.json(visits);
  } catch (err) {
    console.error('Error fetching visits:', err);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

module.exports = router;
