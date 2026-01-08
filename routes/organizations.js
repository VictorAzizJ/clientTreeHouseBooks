// routes/organizations.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Organization = require('../models/Organization');
const TravelingStop = require('../models/TravelingStop');
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

// Validation rules for organizations
const organizationValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Organization name is required')
    .isLength({ min: 1, max: 200 }).withMessage('Name must be 1-200 characters'),

  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),

  body('zipCode')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{5}(-\d{4})?$/).withMessage('Zip code must be in format 12345 or 12345-6789'),

  body('contactMethod')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Contact method must be less than 500 characters'),

  body('organizationType')
    .optional({ checkFalsy: true })
    .isIn(['daycare', 'branch', 'community_partner', 'other']).withMessage('Invalid organization type'),

  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('Notes must be less than 2000 characters')
];

// 1. GET /organizations — list all organizations (with pagination)
router.get('/organizations', ensureAuthenticated, async (req, res) => {
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const skip = (page - 1) * limit;

  // Search/filter parameters
  const search = req.query.search || '';
  const typeFilter = req.query.type || '';
  const showDeleted = req.query.showDeleted === 'true' && req.session.user?.role === 'admin';

  // Base filter: exclude soft-deleted records (unless admin wants to see them)
  const baseFilter = showDeleted ? {} : { isDeleted: { $ne: true } };

  // Build search filter
  let searchFilter = { ...baseFilter };

  if (search) {
    searchFilter.$or = [
      { name: new RegExp(search, 'i') },
      { address: new RegExp(search, 'i') },
      { notes: new RegExp(search, 'i') }
    ];
  }

  if (typeFilter) {
    searchFilter.organizationType = typeFilter;
  }

  try {
    // Get total count for pagination
    const totalOrganizations = await Organization.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalOrganizations / limit);

    // Get paginated organizations
    const organizations = await Organization.find(searchFilter)
      .sort('name')
      .skip(skip)
      .limit(limit)
      .lean();

    // Get flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('organizationsList', {
      user: req.session.user,
      organizations,
      pagination: {
        currentPage: page,
        totalPages,
        totalOrganizations,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      search,
      typeFilter,
      showDeleted,
      organizationTypes: Organization.ORGANIZATION_TYPES,
      success,
      error
    });
  } catch (err) {
    console.error('Error loading organizations list:', err);
    req.session.error = 'Failed to load organizations';
    res.redirect('/dashboard');
  }
});

// 2. GET /organizations/new — form to add a new organization
router.get('/organizations/new', ensureStaffOrAdmin, (req, res) => {
  const error = req.session.error;
  delete req.session.error;

  res.render('newOrganization', {
    user: req.session.user,
    organizationTypes: Organization.ORGANIZATION_TYPES,
    error
  });
});

// 3. POST /organizations — create the organization
router.post('/organizations', ensureStaffOrAdmin, organizationValidationRules, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.session.error = errors.array()[0].msg;
    return res.redirect('/organizations/new');
  }

  const { name, address, zipCode, contactMethod, howHeardAboutUs, organizationType, notes } = req.body;

  try {
    const organizationData = {
      name,
      address: address || undefined,
      zipCode: zipCode || undefined,
      contactMethod: contactMethod || undefined,
      howHeardAboutUs: howHeardAboutUs || undefined,
      organizationType: organizationType || 'other',
      notes: notes || undefined,
      createdBy: req.session.user._id
    };

    const newOrg = await Organization.create(organizationData);

    // Log creation to audit trail
    await auditLogger.logCreate('Organization', newOrg, req.session.user._id);

    req.session.success = 'Organization created successfully';
    res.redirect('/organizations');
  } catch (err) {
    console.error('Error creating organization:', err);
    req.session.error = 'Failed to create organization: ' + err.message;
    res.redirect('/organizations/new');
  }
});

// 4. GET /organizations/:id — show organization details
router.get('/organizations/:id', ensureAuthenticated, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!organization) {
      req.session.error = 'Organization not found';
      return res.redirect('/organizations');
    }

    // Get related traveling stops
    const travelingStops = await TravelingStop.find({
      organization: organization._id,
      isDeleted: { $ne: true }
    })
      .sort('-visitDate')
      .limit(10)
      .lean();

    // Get related donations
    const donations = await Donation.find({
      organization: organization._id,
      isDeleted: { $ne: true }
    })
      .sort('-donatedAt')
      .limit(10)
      .lean();

    // Get flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('organizationDetails', {
      user: req.session.user,
      organization,
      travelingStops,
      donations,
      organizationTypes: Organization.ORGANIZATION_TYPES,
      success,
      error
    });
  } catch (err) {
    console.error('Error loading organization details:', err);
    req.session.error = 'Failed to load organization details';
    res.redirect('/organizations');
  }
});

// 5. GET /organizations/search — JSON endpoint for autocomplete widgets
router.get('/organizations/search', ensureAuthenticated, async (req, res) => {
  const q = req.query.q || '';
  const regex = new RegExp(q, 'i');

  const results = await Organization
    .find({
      name: regex,
      isDeleted: { $ne: true }
    })
    .limit(10)
    .lean();

  res.json(results.map(o => ({
    id: o._id,
    text: o.name,
    type: o.organizationType
  })));
});

// ─── ADMIN EDIT/DELETE ROUTES ─────────────────────────────────────────────────

// 6. GET /organizations/:id/edit — show edit form (admin only)
router.get('/organizations/:id/edit', ensureAdmin, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id).lean();

    if (!organization) {
      req.session.error = 'Organization not found';
      return res.redirect('/organizations');
    }

    // Get flash messages
    const error = req.session.error;
    delete req.session.error;

    res.render('editOrganization', {
      user: req.session.user,
      organization,
      organizationTypes: Organization.ORGANIZATION_TYPES,
      error
    });
  } catch (err) {
    console.error('Error loading organization for edit:', err);
    req.session.error = 'Failed to load organization';
    res.redirect('/organizations');
  }
});

// 7. POST /organizations/:id — update organization (admin only)
router.post('/organizations/:id', ensureAdmin, organizationValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.session.error = errors.array()[0].msg;
    return res.redirect(`/organizations/${req.params.id}/edit`);
  }

  try {
    // Get the original organization for audit logging
    const originalOrg = await Organization.findById(req.params.id);

    if (!originalOrg) {
      req.session.error = 'Organization not found';
      return res.redirect('/organizations');
    }

    const { name, address, zipCode, contactMethod, howHeardAboutUs, organizationType, notes } = req.body;

    // Build update data
    const updateData = {
      name,
      address: address || undefined,
      zipCode: zipCode || undefined,
      contactMethod: contactMethod || undefined,
      howHeardAboutUs: howHeardAboutUs || undefined,
      organizationType: organizationType || 'other',
      notes: notes || undefined,
      updatedBy: req.session.user._id,
      updatedAt: new Date()
    };

    // Update the organization
    const updatedOrg = await Organization.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Log the update to audit trail
    await auditLogger.logUpdate('Organization', req.params.id, originalOrg, updatedOrg, req.session.user._id);

    req.session.success = 'Organization updated successfully';
    res.redirect(`/organizations/${req.params.id}`);
  } catch (err) {
    console.error('Error updating organization:', err);
    req.session.error = 'Failed to update organization: ' + err.message;
    res.redirect(`/organizations/${req.params.id}/edit`);
  }
});

// 8. POST /organizations/:id/delete — soft delete organization (admin only)
router.post('/organizations/:id/delete', ensureAdmin, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      req.session.error = 'Organization not found';
      return res.redirect('/organizations');
    }

    // Soft delete: mark as deleted instead of removing
    await Organization.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      isActive: false,  // Also set legacy field
      deletedAt: new Date(),
      deletedBy: req.session.user._id
    });

    // Log the deletion to audit trail
    await auditLogger.logDelete('Organization', req.params.id, req.session.user._id);

    req.session.success = `Organization "${organization.name}" has been deleted`;
    res.redirect('/organizations');
  } catch (err) {
    console.error('Error deleting organization:', err);
    req.session.error = 'Failed to delete organization';
    res.redirect(`/organizations/${req.params.id}`);
  }
});

// 9. POST /organizations/:id/restore — restore soft-deleted organization (admin only)
router.post('/organizations/:id/restore', ensureAdmin, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      req.session.error = 'Organization not found';
      return res.redirect('/organizations?showDeleted=true');
    }

    // Restore: clear deletion flags
    await Organization.findByIdAndUpdate(req.params.id, {
      isDeleted: false,
      isActive: true,  // Also restore legacy field
      deletedAt: null,
      deletedBy: null
    });

    // Log the restoration to audit trail
    await auditLogger.logRestore('Organization', req.params.id, req.session.user._id);

    req.session.success = `Organization "${organization.name}" has been restored`;
    res.redirect(`/organizations/${req.params.id}`);
  } catch (err) {
    console.error('Error restoring organization:', err);
    req.session.error = 'Failed to restore organization';
    res.redirect('/organizations?showDeleted=true');
  }
});

// 10. GET /organizations/:id/history — get audit history for an organization (admin only)
router.get('/organizations/:id/history', ensureAdmin, async (req, res) => {
  try {
    const history = await auditLogger.getHistory('Organization', req.params.id);
    res.json(history);
  } catch (err) {
    console.error('Error fetching organization history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
