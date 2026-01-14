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

function ensureAdmin(req, res, next) {
  if (req.session.user?.role === 'admin') return next();
  res.status(403).send('Forbidden - Admin only');
}

// GET /checkouts - List all checkouts with pagination
router.get('/checkouts', ensureStaffOrAdmin, async (req, res) => {
  try {
    // Pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const format = req.query.format; // 'csv' for export

    // Search/filter params
    const search = req.query.search || '';
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    // Build query
    let query = {};

    if (dateFrom || dateTo) {
      query.checkoutDate = {};
      if (dateFrom) query.checkoutDate.$gte = new Date(dateFrom);
      if (dateTo) query.checkoutDate.$lte = new Date(dateTo + 'T23:59:59');
    }

    // Get total count for pagination
    const totalCheckouts = await Checkout.countDocuments(query);
    const totalPages = Math.ceil(totalCheckouts / limit);

    // Calculate aggregate stats for ALL matching records (not just current page)
    const statsAggregation = await Checkout.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalBooks: { $sum: { $ifNull: ['$numberOfBooks', 0] } },
          totalWeight: { $sum: { $ifNull: [{ $ifNull: ['$weight', '$totalWeight'] }, 0] } }
        }
      }
    ]);
    const stats = statsAggregation[0] || { totalBooks: 0, totalWeight: 0 };

    // For CSV export, get all matching records (no pagination)
    const fetchLimit = format === 'csv' ? 0 : limit;
    const fetchSkip = format === 'csv' ? 0 : skip;

    // Fetch checkouts
    let checkouts = await Checkout.find(query)
      .populate('member', 'firstName lastName email')
      .populate('recordedBy', 'firstName lastName')
      .sort({ checkoutDate: -1 })
      .skip(fetchSkip)
      .limit(fetchLimit || undefined)
      .lean();

    // Filter by member name if search provided (post-query for populated fields)
    if (search) {
      const searchLower = search.toLowerCase();
      checkouts = checkouts.filter(c =>
        c.member && (
          c.member.firstName?.toLowerCase().includes(searchLower) ||
          c.member.lastName?.toLowerCase().includes(searchLower) ||
          c.member.email?.toLowerCase().includes(searchLower)
        )
      );
    }

    // CSV Export
    if (format === 'csv') {
      const csvRows = [
        ['Date', 'Member Name', 'Member Email', 'Books', 'Weight (lbs)', 'Recorded By'].join(',')
      ];
      checkouts.forEach(c => {
        const memberName = c.member ? `${c.member.firstName} ${c.member.lastName}` : 'Unknown';
        const memberEmail = c.member?.email || '';
        const recordedBy = c.recordedBy ? `${c.recordedBy.firstName} ${c.recordedBy.lastName}` : '';
        csvRows.push([
          new Date(c.checkoutDate).toLocaleDateString(),
          `"${memberName}"`,
          memberEmail,
          c.numberOfBooks || 0,
          (c.weight || c.totalWeight || 0).toFixed(1),
          `"${recordedBy}"`
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="checkouts-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvRows.join('\n'));
    }

    res.render('checkoutsList', {
      user: req.session.user,
      checkouts,
      stats,
      pagination: {
        currentPage: page,
        totalPages,
        totalCheckouts,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        search,
        dateFrom,
        dateTo
      }
    });
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

    // Book category quantities (all optional, at least one should have value)
    body('bookCategories.blackAuthorAdult.quantity').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('bookCategories.adult.quantity').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('bookCategories.blackAuthorKids.quantity').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('bookCategories.kids.quantity').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('bookCategories.boardBooks.quantity').optional({ checkFalsy: true }).isInt({ min: 0 }),

    // Single total weight for entire checkout
    body('totalWeight').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Weight must be a positive number'),

    // Legacy fields for backward compatibility
    body('numberOfBooks').optional({ checkFalsy: true }).isInt({ min: 1, max: 1000 }),
    body('genres').optional({ checkFalsy: true }),
    body('weight').optional({ checkFalsy: true }).isFloat({ min: 0, max: 10000 })
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

    const { memberId, bookCategories, totalWeight, numberOfBooks, genres, weight, redirectTo } = req.body;

    try {
      // Build checkout data
      const checkoutData = {
        member: memberId,
        recordedBy: req.session.user._id
      };

      // If new bookCategories structure is used
      if (bookCategories) {
        checkoutData.bookCategories = {
          blackAuthorAdult: {
            quantity: parseInt(bookCategories.blackAuthorAdult?.quantity) || 0
          },
          adult: {
            quantity: parseInt(bookCategories.adult?.quantity) || 0
          },
          blackAuthorKids: {
            quantity: parseInt(bookCategories.blackAuthorKids?.quantity) || 0
          },
          kids: {
            quantity: parseInt(bookCategories.kids?.quantity) || 0
          },
          boardBooks: {
            quantity: parseInt(bookCategories.boardBooks?.quantity) || 0
          }
        };

        // Calculate total books from categories
        checkoutData.numberOfBooks =
          checkoutData.bookCategories.blackAuthorAdult.quantity +
          checkoutData.bookCategories.adult.quantity +
          checkoutData.bookCategories.blackAuthorKids.quantity +
          checkoutData.bookCategories.kids.quantity +
          checkoutData.bookCategories.boardBooks.quantity;

        // Single total weight
        checkoutData.totalWeight = totalWeight ? parseFloat(totalWeight) : 0;
        checkoutData.weight = checkoutData.totalWeight; // Also store in legacy field
      } else {
        // Legacy format support
        const genreArray = Array.isArray(genres) ? genres : (genres ? [genres] : []);
        checkoutData.numberOfBooks = parseInt(numberOfBooks, 10);
        checkoutData.genres = genreArray;
        checkoutData.weight = weight ? parseFloat(weight) : undefined;
      }

      // Validate at least some books were checked out
      if (!checkoutData.numberOfBooks || checkoutData.numberOfBooks < 1) {
        req.session.error = 'Please enter at least one book';
        return res.redirect(redirectTo || '/checkouts/new');
      }

      // 1. Create checkout record
      await Checkout.create(checkoutData);

      // 2. Fetch member details for email
      const member = await Member.findById(memberId).lean();

      // 3. Send thank-you email (non-blocking, fails silently if email not configured)
      if (member && member.email) {
        sendCheckoutThankYouEmail(member.email, member.firstName, {
          numberOfBooks: checkoutData.numberOfBooks,
          weight: checkoutData.weight
        }).catch(err => {
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

// GET /checkouts/:id/edit - Edit checkout form (Admin only)
router.get('/checkouts/:id/edit', ensureAdmin, async (req, res) => {
  try {
    const checkout = await Checkout.findById(req.params.id)
      .populate('member', 'firstName lastName email')
      .lean();

    if (!checkout) {
      req.session.error = 'Checkout not found';
      return res.redirect('/checkouts');
    }

    res.render('editCheckout', {
      user: req.session.user,
      checkout
    });
  } catch (err) {
    console.error('Error loading checkout for edit:', err);
    req.session.error = 'Error loading checkout';
    res.redirect('/checkouts');
  }
});

// POST /checkouts/:id/edit - Update checkout (Admin only)
router.post('/checkouts/:id/edit', ensureAdmin, async (req, res) => {
  try {
    const { weight, checkoutDate, bookCategories } = req.body;

    // Build book categories from form data
    const categories = {
      blackAuthorAdult: { quantity: parseInt(bookCategories?.blackAuthorAdult?.quantity) || 0 },
      adult: { quantity: parseInt(bookCategories?.adult?.quantity) || 0 },
      blackAuthorKids: { quantity: parseInt(bookCategories?.blackAuthorKids?.quantity) || 0 },
      kids: { quantity: parseInt(bookCategories?.kids?.quantity) || 0 },
      boardBooks: { quantity: parseInt(bookCategories?.boardBooks?.quantity) || 0 }
    };

    // Calculate total books from categories
    const totalBooks = categories.blackAuthorAdult.quantity +
                       categories.adult.quantity +
                       categories.blackAuthorKids.quantity +
                       categories.kids.quantity +
                       categories.boardBooks.quantity;

    const updateData = {
      bookCategories: categories,
      numberOfBooks: totalBooks,
      weight: parseFloat(weight) || 0,
      totalWeight: parseFloat(weight) || 0
    };

    if (checkoutDate) {
      updateData.checkoutDate = new Date(checkoutDate);
    }

    await Checkout.findByIdAndUpdate(req.params.id, updateData);

    req.session.success = 'Checkout updated successfully';
    res.redirect('/checkouts');
  } catch (err) {
    console.error('Error updating checkout:', err);
    req.session.error = 'Error updating checkout';
    res.redirect('/checkouts');
  }
});

// POST /checkouts/:id/delete - Delete checkout (Admin only)
router.post('/checkouts/:id/delete', ensureAdmin, async (req, res) => {
  try {
    await Checkout.findByIdAndDelete(req.params.id);
    req.session.success = 'Checkout deleted successfully';
    res.redirect('/checkouts');
  } catch (err) {
    console.error('Error deleting checkout:', err);
    req.session.error = 'Error deleting checkout';
    res.redirect('/checkouts');
  }
});

module.exports = router;
