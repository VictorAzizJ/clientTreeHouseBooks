// routes/members.js
const express  = require('express');
const { body, validationResult } = require('express-validator');
const router   = express.Router();
const Member   = require('../models/Member');
const Checkout = require('../models/Checkout');
const Donation = require('../models/Donation');

/**
 * Middleware: only staff or admin may proceed.
 */
function ensureStaffOrAdmin(req, res, next) {
  const role = req.session.user?.role;
  if (role === 'staff' || role === 'admin') {
    return next();
  }
  return res.status(403).send('Forbidden');
}

/**
 * Middleware: authenticated users (volunteer, staff, or admin)
 */
function ensureAuthenticated(req, res, next) {
  if (req.session?.user) {
    return next();
  }
  return res.status(403).send('Forbidden');
}

// 1. GET /members/new — form to add a new member
router.get('/members/new', ensureStaffOrAdmin, (req, res) => {
  res.render('newMember', { user: req.session.user });
});

// 2. POST /members — create the member
router.post(
  '/members',
  ensureStaffOrAdmin,
  [
    // Validation rules
    body('firstName')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters')
      .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

    body('lastName')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters')
      .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address')
      .normalizeEmail(),

    body('phone')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^[\d\s\-()+]+$/).withMessage('Phone must contain only numbers, spaces, hyphens, parentheses, and plus signs'),

    body('address')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 200 }).withMessage('Address must be less than 200 characters')
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      req.session.error = firstError;
      return res.redirect('/members/new');
    }

    const { firstName, lastName, email, phone, address } = req.body;

    try {
      await Member.create({ firstName, lastName, email, phone, address });
      req.session.success = 'Member created';
      res.redirect('/members');
    } catch (err) {
      console.error('Error creating member:', err);
      req.session.error = 'Failed to create member';
      res.redirect('/members/new');
    }
  }
);

// 3. GET /members — list all members (with pagination)
router.get('/members', ensureAuthenticated, async (req, res) => {
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25; // 25 members per page
  const skip = (page - 1) * limit;

  // Search/filter parameters
  const search = req.query.search || '';
  const searchFilter = search
    ? {
        $or: [
          { firstName: new RegExp(search, 'i') },
          { lastName: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ]
      }
    : {};

  try {
    // Get total count for pagination
    const totalMembers = await Member.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalMembers / limit);

    // Get paginated members
    const members = await Member.find(searchFilter)
      .sort('lastName')
      .skip(skip)
      .limit(limit)
      .lean();

    // Get flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('membersList', {
      user: req.session.user,
      members,
      pagination: {
        currentPage: page,
        totalPages,
        totalMembers,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      search,
      success,
      error
    });
  } catch (err) {
    console.error('Error loading members list:', err);
    req.session.error = 'Failed to load members';
    res.redirect('/dashboard');
  }
});

// 4. GET /members/:id — show details + history
router.get('/members/:id', ensureAuthenticated, async (req, res) => {
  const member = await Member.findById(req.params.id).lean();

  const checkoutHistory = await Checkout.find({ member: member._id })
    .sort('-checkoutDate')
    .lean();

  const donationHistory = await Donation.find({ member: member._id })
    .sort('-donatedAt')
    .lean();

  res.render('memberDetails', {
    user: req.session.user,
    member,
    checkoutHistory,
    donationHistory
  });
}); // <— this was missing

// 5. GET /members/search — JSON endpoint for autocomplete widgets
router.get('/members/search', ensureAuthenticated, async (req, res) => {
  const q     = req.query.q || '';
  const regex = new RegExp(q, 'i');
  const results = await Member
    .find({
      $or: [
        { firstName: regex },
        { lastName:  regex },
        { email:     regex }
      ]
    })
    .limit(10)
    .lean();

  res.json(results.map(m => ({
    id:   m._id,
    text: `${m.firstName} ${m.lastName} <${m.email}>`
  })));
});

module.exports = router;

