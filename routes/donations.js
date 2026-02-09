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
const Organization = require('../models/Organization');
const { ensureStaffOrAdmin, ensureAdmin } = require('./_middleware');
const { sendDonationThankYouEmail } = require('../services/mailer');

// GET /donations - List all donations with pagination
router.get('/donations', ensureStaffOrAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const format = req.query.format; // 'csv' for export
    const search = req.query.search || '';
    const donationType = req.query.donationType || '';
    const donorType = req.query.donorType || '';
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    // Build query
    let query = {};
    if (donationType) {
      query.donationType = donationType;
    }
    if (donorType) {
      query.donorType = donorType;
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo + 'T23:59:59');
    }

    const totalDonations = await Donation.countDocuments(query);
    const totalPages = Math.ceil(totalDonations / limit);

    // For CSV export, get all matching records
    const fetchLimit = format === 'csv' ? 0 : limit;
    const fetchSkip = format === 'csv' ? 0 : skip;

    let donations = await Donation.find(query)
      .populate('member', 'firstName lastName email')
      .populate('organization', 'name')
      .populate('recordedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(fetchSkip)
      .limit(fetchLimit || undefined)
      .lean();

    // Post-query filtering for name/org search
    if (search) {
      const searchLower = search.toLowerCase();
      donations = donations.filter(d => {
        if (d.member) {
          const fullName = `${d.member.firstName} ${d.member.lastName}`.toLowerCase();
          if (fullName.includes(searchLower)) return true;
          if (d.member.email && d.member.email.toLowerCase().includes(searchLower)) return true;
        }
        if (d.organization && d.organization.name && d.organization.name.toLowerCase().includes(searchLower)) {
          return true;
        }
        return false;
      });
    }

    // Calculate stats for the current view
    const stats = {
      totalBooks: donations.reduce((sum, d) => sum + (d.numberOfBooks || 0), 0),
      totalValue: donations.reduce((sum, d) => sum + (d.monetaryAmount || 0), 0)
    };

    // CSV Export
    if (format === 'csv') {
      const csvRows = [
        ['Date', 'Type', 'Donor Type', 'Member/Organization', 'Books', 'Value ($)', 'Book Drive', 'Notes', 'Recorded By'].join(',')
      ];
      donations.forEach(d => {
        let donorName = 'Undisclosed';
        if (d.member) {
          donorName = `${d.member.firstName} ${d.member.lastName}`;
        } else if (d.organization) {
          donorName = d.organization.name;
        }
        const recordedBy = d.recordedBy ? `${d.recordedBy.firstName} ${d.recordedBy.lastName}` : '';
        csvRows.push([
          new Date(d.createdAt).toLocaleDateString(),
          d.donationType === 'new' ? 'New Books' : 'Used Books',
          d.donorType || 'undisclosed',
          `"${donorName}"`,
          d.numberOfBooks || 0,
          (d.monetaryAmount || 0).toFixed(2),
          d.isBookDrive ? (d.bookDriveName || 'Yes') : 'No',
          `"${(d.notes || '').replace(/"/g, '""')}"`,
          `"${recordedBy}"`
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="donations-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvRows.join('\n'));
    }

    // Get flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('donationsList', {
      user: req.session.user,
      donations,
      totalDonations,
      stats,
      page,
      limit,
      totalPages,
      search,
      donationType,
      donorType,
      dateFrom: dateFrom || '',
      dateTo: dateTo || '',
      success,
      error
    });
  } catch (err) {
    console.error('Error fetching donations:', err);
    res.status(500).send('Error loading donations');
  }
});

// Show form to record a donation (standalone - choose member or enter donor info)
router.get('/donations/new', ensureStaffOrAdmin, async (req, res) => {
  try {
    const donationType = req.query.type || 'used'; // 'used' or 'new'
    res.render('newDonationStandalone', { user: req.session.user, donationType });
  } catch (err) {
    console.error('Error loading donation form:', err);
    res.status(500).send('Error loading form');
  }
});

// Show form to record a donation for a specific member
router.get('/members/:memberId/donations/new', ensureStaffOrAdmin, async (req, res) => {
  const member = await Member.findById(req.params.memberId).lean();
  if (!member) return res.status(404).send('Member not found');
  const donationType = req.query.type || 'used';
  res.render('newDonation', { user: req.session.user, member, donationType });
});

// Handle standalone donation submission (without pre-selected member)
router.post(
  '/donations',
  ensureStaffOrAdmin,
  [
    // Validation rules
    body('donationType')
      .trim()
      .notEmpty().withMessage('Donation type is required')
      .isIn(['used', 'new']).withMessage('Donation type must be "used" or "new"'),

    body('donorType')
      .optional({ checkFalsy: true })
      .isIn(['organization', 'person', 'undisclosed']),

    body('memberId')
      .optional({ checkFalsy: true })
      .isMongoId().withMessage('Invalid member ID'),

    body('organizationId')
      .optional({ checkFalsy: true })
      .isMongoId().withMessage('Invalid organization ID'),

    body('numberOfBooks')
      .trim()
      .notEmpty().withMessage('Number of books is required')
      .isInt({ min: 1, max: 100000 }).withMessage('Number of books must be between 1 and 100,000'),

    body('monetaryAmount')
      .optional({ checkFalsy: true })
      .isFloat({ min: 0 }).withMessage('Monetary amount must be a positive number'),

    body('isBookDrive')
      .optional({ checkFalsy: true }),

    body('bookDriveName')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 200 }),

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
      return res.redirect('/donations/new');
    }

    const { donationType, donorType, memberId, organizationId, numberOfBooks, monetaryAmount, isBookDrive, bookDriveName, notes } = req.body;

    try {
      const donationData = {
        donationType,
        donorType: donorType || 'undisclosed',
        member: memberId || undefined,
        organization: organizationId || undefined,
        numberOfBooks: parseInt(numberOfBooks, 10),
        monetaryAmount: monetaryAmount ? parseFloat(monetaryAmount) : 0,
        isBookDrive: isBookDrive === 'true',
        bookDriveName: bookDriveName || undefined,
        notes: notes || undefined,
        recordedBy: req.session.user._id
      };

      const donation = await Donation.create(donationData);

      // Send thank-you email (event-driven trigger)
      let emailSent = false;

      // If person donor with member record
      if (memberId) {
        const member = await Member.findById(memberId).lean();
        if (member && member.email) {
          // Fire-and-forget email - don't block the response
          sendDonationThankYouEmail(member.email, member.firstName, {
            numberOfBooks: donationData.numberOfBooks,
            donationType,
            donationId: donation._id.toString()
          }).then(result => {
            if (result.success) {
              console.log(`✅ Donation thank-you email sent for donation ${donation._id}`);
            } else {
              console.log(`ℹ️ Donation thank-you email not sent: ${result.error}`);
            }
          }).catch(err => {
            console.error('Email sending failed (non-critical):', err.message);
          });
          emailSent = true;
        }
      }

      // If organization donor (check if org has contact email)
      if (organizationId && !emailSent) {
        const org = await Organization.findById(organizationId).lean();
        if (org && org.contactEmail) {
          sendDonationThankYouEmail(org.contactEmail, org.contactName || org.name, {
            numberOfBooks: donationData.numberOfBooks,
            donationType,
            donationId: donation._id.toString()
          }).catch(err => {
            console.error('Org email sending failed (non-critical):', err.message);
          });
        } else if (org) {
          console.log(`ℹ️ Donation recorded for org: ${org.name} (no contact email)`);
        }
      }

      req.session.success = `${donationType === 'new' ? 'New' : 'Used'} book donation recorded`;
      res.redirect('/donations/new');

    } catch (err) {
      console.error('Error recording donation:', err);
      req.session.error = 'Failed to record donation';
      res.redirect('/donations/new');
    }
  }
);

// Handle donation submission for a specific member
router.post(
  '/members/:memberId/donations',
  ensureStaffOrAdmin,
  [
    body('donationType')
      .trim()
      .notEmpty().withMessage('Donation type is required')
      .isIn(['used', 'new']).withMessage('Donation type must be "used" or "new"'),

    body('numberOfBooks')
      .trim()
      .notEmpty().withMessage('Number of books is required')
      .isInt({ min: 1, max: 100000 }).withMessage('Number of books must be between 1 and 100,000'),

    body('monetaryAmount')
      .optional({ checkFalsy: true })
      .isFloat({ min: 0 }).withMessage('Monetary amount must be a positive number'),

    body('isBookDrive')
      .optional({ checkFalsy: true }),

    body('bookDriveName')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 200 }),

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
      return res.redirect(`/members/${req.params.memberId}/donations/new`);
    }

    const { donationType, numberOfBooks, monetaryAmount, isBookDrive, bookDriveName, notes } = req.body;

    try {
      const donationData = {
        donationType,
        donorType: 'person',
        member: req.params.memberId,
        numberOfBooks: parseInt(numberOfBooks, 10),
        monetaryAmount: monetaryAmount ? parseFloat(monetaryAmount) : 0,
        isBookDrive: isBookDrive === 'true',
        bookDriveName: bookDriveName || undefined,
        notes: notes || undefined,
        recordedBy: req.session.user._id
      };

      const donation = await Donation.create(donationData);

      // Fetch member details for email
      const member = await Member.findById(req.params.memberId).lean();

      // Send thank-you email (event-driven trigger)
      if (member && member.email) {
        sendDonationThankYouEmail(member.email, member.firstName, {
          numberOfBooks: donationData.numberOfBooks,
          donationType,
          donationId: donation._id.toString()
        }).then(result => {
          if (result.success) {
            console.log(`✅ Donation thank-you email sent for donation ${donation._id}`);
          } else {
            console.log(`ℹ️ Donation thank-you email not sent: ${result.error}`);
          }
        }).catch(err => {
          console.error('Email sending failed (non-critical):', err.message);
        });
      }

      req.session.success = 'Donation recorded';
      res.redirect(`/members/${req.params.memberId}`);

    } catch (err) {
      console.error('Error recording donation:', err);
      req.session.error = 'Failed to record donation';
      res.redirect(`/members/${req.params.memberId}`);
    }
  }
);

// GET /donations/:id/edit - Edit donation form (Admin only)
router.get('/donations/:id/edit', ensureAdmin, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('member', 'firstName lastName email')
      .populate('organization', 'name')
      .lean();

    if (!donation) {
      req.session.error = 'Donation not found';
      return res.redirect('/donations');
    }

    res.render('editDonation', {
      user: req.session.user,
      donation
    });
  } catch (err) {
    console.error('Error loading donation for edit:', err);
    req.session.error = 'Error loading donation';
    res.redirect('/donations');
  }
});

// POST /donations/:id/edit - Update donation (Admin only)
router.post('/donations/:id/edit', ensureAdmin, async (req, res) => {
  try {
    const { donationType, numberOfBooks, monetaryAmount, isBookDrive, bookDriveName, notes } = req.body;

    const updateData = {
      donationType,
      numberOfBooks: parseInt(numberOfBooks) || 0,
      monetaryAmount: parseFloat(monetaryAmount) || 0,
      isBookDrive: isBookDrive === 'true',
      bookDriveName: bookDriveName || undefined,
      notes: notes || undefined
    };

    await Donation.findByIdAndUpdate(req.params.id, updateData);

    req.session.success = 'Donation updated successfully';
    res.redirect('/donations');
  } catch (err) {
    console.error('Error updating donation:', err);
    req.session.error = 'Error updating donation';
    res.redirect('/donations');
  }
});

// POST /donations/:id/delete - Delete donation (Admin only)
router.post('/donations/:id/delete', ensureAdmin, async (req, res) => {
  try {
    await Donation.findByIdAndDelete(req.params.id);
    req.session.success = 'Donation deleted successfully';
    res.redirect('/donations');
  } catch (err) {
    console.error('Error deleting donation:', err);
    req.session.error = 'Error deleting donation';
    res.redirect('/donations');
  }
});

module.exports = router;
