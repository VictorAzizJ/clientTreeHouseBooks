// routes/donations.js
// ═════════════════════════════════════════════════════════════════════════════
// DONATION ROUTES - Record book donations and send thank-you emails
// ═════════════════════════════════════════════════════════════════════════════
//
// 📧 EMAIL INTEGRATION:
//
// When a donation is recorded, the system automatically sends a thank-you email
// to the member if:
// 1. Email service is configured (EMAIL_USER and EMAIL_PASSWORD env vars set)
// 2. Member has a valid email address in their profile
//
// If email sending fails, the donation is still recorded successfully.
// Emails are non-critical and failures are logged but don't block the operation.
//
// See services/mailer.js for email configuration instructions.
//
// ─────────────────────────────────────────────────────────────────────────────

const express   = require('express');
const { body, validationResult } = require('express-validator');
const router    = express.Router();
const Donation  = require('../models/Donation');
const Member    = require('../models/Member');
const { ensureStaffOrAdmin } = require('./_middleware');
const { sendDonationThankYouEmail } = require('../services/mailer');

// Show form to record a donation (standalone - choose member)
router.get('/donations/new', ensureStaffOrAdmin, async (req, res) => {
  try {
    const members = await Member.find().sort({ lastName: 1, firstName: 1 }).lean();
    res.render('newDonationStandalone', { user: req.session.user, members });
  } catch (err) {
    console.error('Error loading donation form:', err);
    res.status(500).send('Error loading form');
  }
});

// Show form to record a donation for a specific member
router.get('/members/:memberId/donations/new', ensureStaffOrAdmin, async (req, res) => {
  const member = await Member.findById(req.params.memberId).lean();
  if (!member) return res.status(404).send('Member not found');
  res.render('newDonation', { user: req.session.user, member });
});

// Handle donation submission
router.post(
  '/members/:memberId/donations',
  ensureStaffOrAdmin,
  [
    // Validation rules
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
      return res.redirect(`/members/${req.params.memberId}/donations/new`);
    }

    const { numberOfBooks, genres, weight } = req.body;
    const genreArray = Array.isArray(genres) ? genres : (genres ? [genres] : []);

    try {
      // 1. Create donation record
      await Donation.create({
        member:        req.params.memberId,
        numberOfBooks: parseInt(numberOfBooks, 10),
        genres:        genreArray,
        weight:        weight ? parseFloat(weight) : undefined
      });

      // 2. Fetch member details for email
      const member = await Member.findById(req.params.memberId).lean();

      // 3. Send thank-you email (non-blocking, fails silently if email not configured)
      if (member && member.email) {
        // Fire and forget - don't await (don't block the response)
        sendDonationThankYouEmail(member.email, member.firstName, {
          numberOfBooks: parseInt(numberOfBooks, 10),
          genres: genreArray,
          weight: weight ? parseFloat(weight) : undefined
        }).catch(err => {
          // Already logged in mailer.js, just prevent unhandled rejection
          console.error('Email sending failed (non-critical):', err.message);
        });
      }

      // 4. Success message and redirect
      req.session.success = 'Donation recorded';
      res.redirect(`/members/${req.params.memberId}`);

    } catch (err) {
      console.error('Error recording donation:', err);
      req.session.error = 'Failed to record donation';
      res.redirect(`/members/${req.params.memberId}`);
    }
  }
);

module.exports = router;
