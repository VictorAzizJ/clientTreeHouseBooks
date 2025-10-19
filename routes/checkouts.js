// routes/checkouts.js
// ═════════════════════════════════════════════════════════════════════════════
// CHECKOUT ROUTES - Record book checkouts and send thank-you emails
// ═════════════════════════════════════════════════════════════════════════════
//
// 📧 EMAIL INTEGRATION:
//
// When a checkout is recorded, the system automatically sends a thank-you email
// to the member if:
// 1. Email service is configured (EMAIL_USER and EMAIL_PASSWORD env vars set)
// 2. Member has a valid email address in their profile
//
// If email sending fails, the checkout is still recorded successfully.
// Emails are non-critical and failures are logged but don't block the operation.
//
// See services/mailer.js for email configuration instructions.
//
// ─────────────────────────────────────────────────────────────────────────────

const express  = require('express');
const { body, validationResult } = require('express-validator');
const router   = express.Router();
const Member   = require('../models/Member');
const Checkout = require('../models/Checkout');
const { sendCheckoutThankYouEmail } = require('../services/mailer');

function ensureStaffOrAdmin(req, res, next) {
  const role = req.session.user?.role;
  if (role === 'staff' || role === 'admin') return next();
  res.status(403).send('Forbidden');
}

// Redirect /checkouts to list view (backward compatibility)
router.get('/checkouts', ensureStaffOrAdmin, async (req, res) => {
  try {
    const checkouts = await Checkout.find()
      .populate('member', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.render('checkoutsList', { user: req.session.user, checkouts });
  } catch (err) {
    console.error('Error fetching checkouts:', err);
    res.status(500).send('Error loading checkouts');
  }
});

// GET form to create new checkout
router.get('/checkouts/new', ensureStaffOrAdmin, async (req, res) => {
  try {
    // Don't load all members - use search instead
    res.render('newCheckout', { user: req.session.user });
  } catch (err) {
    console.error('Error loading checkout form:', err);
    res.status(500).send('Error loading form');
  }
});

// POST create a checkout
router.post(
  '/checkouts',
  ensureStaffOrAdmin,
  [
    // Validation rules
    body('memberId')
      .trim()
      .notEmpty().withMessage('Member is required')
      .isMongoId().withMessage('Invalid member ID'),

    body('numberOfBooks')
      .trim()
      .notEmpty().withMessage('Number of books is required')
      .isInt({ min: 1, max: 1000 }).withMessage('Number of books must be between 1 and 1000'),

    body('genres')
      .optional({ checkFalsy: true }),

    body('weight')
      .optional({ checkFalsy: true })
      .isFloat({ min: 0, max: 10000 }).withMessage('Weight must be a positive number less than 10000')
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      req.session.error = firstError;
      const redirectTo = req.body.redirectTo || '/checkouts';
      return res.redirect(redirectTo);
    }

    const { memberId, numberOfBooks, genres, weight, redirectTo } = req.body;
    const genreArray = Array.isArray(genres) ? genres : (genres ? [genres] : []);

    try {
      // 1. Create checkout record
      await Checkout.create({
        member:        memberId,
        numberOfBooks: parseInt(numberOfBooks, 10),
        genres:        genreArray,
        weight:        weight ? parseFloat(weight) : undefined
      });

      // 2. Fetch member details for email
      const member = await Member.findById(memberId).lean();

      // 3. Send thank-you email (non-blocking, fails silently if email not configured)
      if (member && member.email) {
        // Fire and forget - don't await (don't block the response)
        sendCheckoutThankYouEmail(member.email, member.firstName, {
          numberOfBooks: parseInt(numberOfBooks, 10),
          genres: genreArray,
          weight: weight ? parseFloat(weight) : undefined
        }).catch(err => {
          // Already logged in mailer.js, just prevent unhandled rejection
          console.error('Email sending failed (non-critical):', err.message);
        });
      }

      // 4. Redirect back to either the supplied URL or the list
      if (redirectTo) {
        return res.redirect(redirectTo);
      }
      req.session.success = 'Checkout recorded successfully';
      res.redirect('/checkouts');

    } catch (err) {
      console.error('Error creating checkout:', err);
      req.session.error = 'Failed to record checkout';
      res.redirect(redirectTo || '/checkouts');
    }
  }
);

module.exports = router;
