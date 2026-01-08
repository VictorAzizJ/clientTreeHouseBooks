// routes/members.js
const express  = require('express');
const { body, validationResult } = require('express-validator');
const router   = express.Router();
const Member   = require('../models/Member');
const Checkout = require('../models/Checkout');
const Donation = require('../models/Donation');
const auditLogger = require('../utils/auditLogger');

/**
 * Middleware: only admin may proceed.
 */
function ensureAdmin(req, res, next) {
  const role = req.session.user?.role;
  if (role === 'admin') {
    return next();
  }
  return res.status(403).send('Forbidden: Admin access required');
}

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
router.get('/members/new', ensureAuthenticated, (req, res) => {
  res.render('newMember', { user: req.session.user });
});

// 2. POST /members — create the member
router.post(
  '/members',
  ensureAuthenticated,
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

    // Email is required for adults, optional for children
    body('email')
      .if((value, { req }) => req.body.memberType !== 'child')
      .trim()
      .notEmpty().withMessage('Email is required for adult members')
      .isEmail().withMessage('Must be a valid email address')
      .normalizeEmail(),

    body('email')
      .if((value, { req }) => req.body.memberType === 'child')
      .optional({ checkFalsy: true })
      .trim()
      .isEmail().withMessage('Must be a valid email address')
      .normalizeEmail(),

    body('phone')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^[\d\s\-()+]+$/).withMessage('Phone must contain only numbers, spaces, hyphens, parentheses, and plus signs'),

    body('zipCode')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\d{5}(-\d{4})?$/).withMessage('Zip code must be in format 12345 or 12345-6789'),

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

    const { firstName, lastName, email, phone, address, zipCode, memberType, parent, dateOfBirth, grade, school } = req.body;

    try {
      const memberData = {
        firstName,
        lastName,
        email: email || undefined,  // Allow empty email for children
        phone,
        zipCode,
        memberType: memberType || 'adult'
      };

      // Only staff/admin can set full address
      if (req.session.user.role === 'staff' || req.session.user.role === 'admin') {
        memberData.address = address;
      }

      // If it's a child member
      if (memberType === 'child') {
        // Parent is now optional
        if (parent) {
          memberData.parent = parent;
        }
        // Additional child fields
        if (dateOfBirth) {
          memberData.dateOfBirth = new Date(dateOfBirth);
        }
        if (grade) {
          memberData.grade = grade;
        }
        if (school) {
          memberData.school = school;
        }
      }

      await Member.create(memberData);
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
  const showDeleted = req.query.showDeleted === 'true' && req.session.user?.role === 'admin';

  // Base filter: exclude soft-deleted records (unless admin wants to see them)
  const baseFilter = showDeleted ? {} : { isDeleted: { $ne: true } };

  const searchFilter = search
    ? {
        ...baseFilter,
        $or: [
          { firstName: new RegExp(search, 'i') },
          { lastName: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ]
      }
    : baseFilter;

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
      showDeleted,
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
  try {
    const member = await Member.findById(req.params.id).populate('parent', 'firstName lastName').lean();

    if (!member) {
      req.session.error = 'Member not found';
      return res.redirect('/members');
    }

    const checkoutHistory = await Checkout.find({
      member: member._id,
      isDeleted: { $ne: true }
    })
      .sort('-checkoutDate')
      .lean();

    const donationHistory = await Donation.find({
      member: member._id,
      isDeleted: { $ne: true }
    })
      .sort('-donatedAt')
      .lean();

    // Get flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('memberDetails', {
      user: req.session.user,
      member,
      checkoutHistory,
      donationHistory,
      success,
      error
    });
  } catch (err) {
    console.error('Error loading member details:', err);
    req.session.error = 'Failed to load member details';
    res.redirect('/members');
  }
});

// 5. GET /members/search — JSON endpoint for autocomplete widgets
router.get('/members/search', ensureAuthenticated, async (req, res) => {
  const q           = req.query.q || '';
  const memberType  = req.query.memberType;
  const regex       = new RegExp(q, 'i');

  const query = {
    $or: [
      { firstName: regex },
      { lastName:  regex },
      { email:     regex }
    ]
  };

  // Filter by member type if specified
  if (memberType) {
    query.memberType = memberType;
  }

  const results = await Member
    .find(query)
    .limit(10)
    .lean();

  res.json(results.map(m => ({
    id:   m._id,
    text: `${m.firstName} ${m.lastName} <${m.email}>`
  })));
});

// ─── ADMIN EDIT/DELETE ROUTES ─────────────────────────────────────────────────

// Validation rules for member updates (reusable)
const memberValidationRules = [
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
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[\d\s\-()+]+$/).withMessage('Phone must contain only numbers, spaces, hyphens, parentheses, and plus signs'),

  body('zipCode')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{5}(-\d{4})?$/).withMessage('Zip code must be in format 12345 or 12345-6789'),

  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Address must be less than 200 characters')
];

// 6. GET /members/:id/edit — show edit form (admin only)
router.get('/members/:id/edit', ensureAdmin, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).populate('parent', 'firstName lastName').lean();

    if (!member) {
      req.session.error = 'Member not found';
      return res.redirect('/members');
    }

    // Get all adult members for parent dropdown (for child members)
    const adults = await Member.find({
      memberType: 'adult',
      isDeleted: { $ne: true }
    }).sort('lastName').lean();

    // Get flash messages
    const error = req.session.error;
    delete req.session.error;

    res.render('editMember', {
      user: req.session.user,
      member,
      adults,
      error
    });
  } catch (err) {
    console.error('Error loading member for edit:', err);
    req.session.error = 'Failed to load member';
    res.redirect('/members');
  }
});

// 7. POST /members/:id — update member (admin only)
router.post('/members/:id', ensureAdmin, memberValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.session.error = errors.array()[0].msg;
    return res.redirect(`/members/${req.params.id}/edit`);
  }

  try {
    // Get the original member for audit logging
    const originalMember = await Member.findById(req.params.id);

    if (!originalMember) {
      req.session.error = 'Member not found';
      return res.redirect('/members');
    }

    const {
      firstName, lastName, email, phone, address, zipCode, notes,
      memberType, parent, dateOfBirth, grade, school,
      emergencyContactName, emergencyContactPhone, emergencyContactRelationship
    } = req.body;

    // Build update data
    const updateData = {
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      zipCode: zipCode || undefined,
      notes: notes || undefined,
      memberType: memberType || 'adult',
      updatedBy: req.session.user._id,
      updatedAt: new Date()
    };

    // Handle child-specific fields
    if (memberType === 'child') {
      updateData.parent = parent || undefined;
      updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
      updateData.grade = grade || undefined;
      updateData.school = school || undefined;
    } else {
      // Clear child fields if switching to adult
      updateData.parent = undefined;
      updateData.dateOfBirth = undefined;
      updateData.grade = undefined;
      updateData.school = undefined;
    }

    // Handle emergency contact
    if (emergencyContactName || emergencyContactPhone || emergencyContactRelationship) {
      updateData.emergencyContact = {
        name: emergencyContactName || undefined,
        phone: emergencyContactPhone || undefined,
        relationship: emergencyContactRelationship || undefined
      };
    }

    // Update the member
    const updatedMember = await Member.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Log the update to audit trail
    await auditLogger.logUpdate('Member', req.params.id, originalMember, updatedMember, req.session.user._id);

    req.session.success = 'Member updated successfully';
    res.redirect(`/members/${req.params.id}`);
  } catch (err) {
    console.error('Error updating member:', err);
    req.session.error = 'Failed to update member: ' + err.message;
    res.redirect(`/members/${req.params.id}/edit`);
  }
});

// 8. POST /members/:id/delete — soft delete member (admin only)
router.post('/members/:id/delete', ensureAdmin, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      req.session.error = 'Member not found';
      return res.redirect('/members');
    }

    // Soft delete: mark as deleted instead of removing
    await Member.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.session.user._id
    });

    // Log the deletion to audit trail
    await auditLogger.logDelete('Member', req.params.id, req.session.user._id);

    req.session.success = `Member "${member.firstName} ${member.lastName}" has been deleted`;
    res.redirect('/members');
  } catch (err) {
    console.error('Error deleting member:', err);
    req.session.error = 'Failed to delete member';
    res.redirect(`/members/${req.params.id}`);
  }
});

// 9. POST /members/:id/restore — restore soft-deleted member (admin only)
router.post('/members/:id/restore', ensureAdmin, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      req.session.error = 'Member not found';
      return res.redirect('/members?showDeleted=true');
    }

    // Restore: clear deletion flags
    await Member.findByIdAndUpdate(req.params.id, {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null
    });

    // Log the restoration to audit trail
    await auditLogger.logRestore('Member', req.params.id, req.session.user._id);

    req.session.success = `Member "${member.firstName} ${member.lastName}" has been restored`;
    res.redirect(`/members/${req.params.id}`);
  } catch (err) {
    console.error('Error restoring member:', err);
    req.session.error = 'Failed to restore member';
    res.redirect('/members?showDeleted=true');
  }
});

// 10. GET /members/:id/history — get audit history for a member (admin only)
router.get('/members/:id/history', ensureAdmin, async (req, res) => {
  try {
    const history = await auditLogger.getHistory('Member', req.params.id);
    res.json(history);
  } catch (err) {
    console.error('Error fetching member history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;

