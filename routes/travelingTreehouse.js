// routes/travelingTreehouse.js
// ═══════════════════════════════════════════════════════════════════════════════
// Traveling Tree House Program Routes
// Handles CRUD operations, analytics dashboard, and data export for stop tracking
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const TravelingStop = require('../models/TravelingStop');
const Organization = require('../models/Organization');
const { ensureStaffOrAdmin } = require('./_middleware');

// ─── Validation Rules ────────────────────────────────────────────────────────
// Reusable validation chain for create/update operations
const stopValidation = [
  body('date')
    .trim()
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid date format'),

  body('stopName')
    .trim()
    .notEmpty().withMessage('Stop name is required')
    .isLength({ min: 1, max: 200 }).withMessage('Stop name must be 1-200 characters'),

  body('stopType')
    .trim()
    .notEmpty().withMessage('Stop type is required')
    .isIn(TravelingStop.STOP_TYPES).withMessage('Invalid stop type'),

  body('stopAddress')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 1, max: 500 }).withMessage('Address must be 1-500 characters'),

  body('stopZipCode')
    .trim()
    .notEmpty().withMessage('ZIP code is required')
    .matches(/^\d{5}(-\d{4})?$/).withMessage('ZIP code must be 5 digits (12345) or ZIP+4 format (12345-6789)'),

  body('booksDistributed')
    .trim()
    .notEmpty().withMessage('Number of books distributed is required')
    .isInt({ min: 0, max: 100000 }).withMessage('Books distributed must be between 0 and 100,000'),

  body('contactMethod')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Contact method must be under 500 characters'),

  body('howHeardAboutUs')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('How heard about us must be under 500 characters'),

  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('Notes must be under 2000 characters')
];

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Build stop data object from request body
 * Handles checkbox values and nested settings objects
 * @param {Object} body - Request body
 * @param {String} userId - Optional user ID for createdBy field
 * @returns {Object} Stop data ready for database
 */
function buildStopData(body, userId = null) {
  const data = {
    date: body.date,
    stopName: body.stopName,
    stopType: body.stopType,
    stopAddress: body.stopAddress,
    stopZipCode: body.stopZipCode,
    booksDistributed: parseInt(body.booksDistributed, 10),
    contactMethod: body.contactMethod || '',
    howHeardAboutUs: body.howHeardAboutUs || '',
    // Checkbox values come as 'on' string when checked
    didWeReadToThem: body.didWeReadToThem === 'on' || body.didWeReadToThem === true,
    notes: body.notes || '',
    // Nested settings for conditional fields
    daycareSettings: {
      hasStickerDisplayed: body.hasStickerDisplayed === 'on' || body.hasStickerDisplayed === true
    },
    branchSettings: {
      hasSignageDisplayed: body.hasSignageDisplayed === 'on' || body.hasSignageDisplayed === true
    },
    communityEventSettings: {
      wereWeOnFlyer: body.wereWeOnFlyer === 'on' || body.wereWeOnFlyer === true,
      featuredOnTheirSocialMedia: body.featuredOnTheirSocialMedia === 'on' || body.featuredOnTheirSocialMedia === true,
      didWeShareOnOurSocialMedia: body.didWeShareOnOurSocialMedia === 'on' || body.didWeShareOnOurSocialMedia === true
    }
  };

  // Link to organization if selected
  if (body.organizationId) {
    data.organization = body.organizationId;
  }

  // Only set createdBy on new records
  if (userId) {
    data.createdBy = userId;
  }

  return data;
}

/**
 * Create or find organization based on form data
 * @param {Object} body - Request body
 * @param {String} userId - User ID for createdBy
 * @returns {Promise<String|null>} Organization ID or null
 */
async function handleOrganization(body, userId) {
  // If organization was selected from dropdown, return its ID
  if (body.organizationId) {
    return body.organizationId;
  }

  // If "save for future" is checked, create new organization
  if (body.saveOrganization === 'on' || body.saveOrganization === true) {
    try {
      const orgData = {
        name: body.stopName,
        address: body.stopAddress,
        zipCode: body.stopZipCode,
        contactMethod: body.contactMethod,
        howHeardAboutUs: body.howHeardAboutUs,
        organizationType: mapStopTypeToOrgType(body.stopType),
        createdBy: userId
      };

      const org = await Organization.create(orgData);
      return org._id;
    } catch (err) {
      console.error('Error creating organization:', err);
      // Don't fail the stop creation if org creation fails
      return null;
    }
  }

  return null;
}

/**
 * Map stop type to organization type
 * @param {String} stopType - Stop type value
 * @returns {String} Organization type
 */
function mapStopTypeToOrgType(stopType) {
  const mapping = {
    'daycare': 'daycare',
    'branch': 'branch',
    'community_event': 'community_partner'
  };
  return mapping[stopType] || 'other';
}

/**
 * Build query object from request query parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} MongoDB query object
 */
function buildQueryFromParams(query) {
  const mongoQuery = {};

  // Filter by stop type
  if (query.type && TravelingStop.STOP_TYPES.includes(query.type)) {
    mongoQuery.stopType = query.type;
  }

  // Date range filter
  if (query.startDate || query.endDate) {
    mongoQuery.date = {};
    if (query.startDate) mongoQuery.date.$gte = query.startDate;
    if (query.endDate) mongoQuery.date.$lte = query.endDate;
  }

  // ZIP code filter
  if (query.zipCode) {
    mongoQuery.stopZipCode = query.zipCode;
  }

  return mongoQuery;
}

/**
 * Format stop type for display (e.g., 'community_event' -> 'Community Event')
 * @param {String} type - Stop type value
 * @returns {String} Formatted display string
 */
function formatStopType(type) {
  const formats = {
    'daycare': 'Daycare',
    'branch': 'Branch',
    'community_event': 'Community Event'
  };
  return formats[type] || type;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORGANIZATION API ENDPOINTS
// For organization auto-fill functionality
// ═══════════════════════════════════════════════════════════════════════════════

// Search organizations - GET /api/organizations/search
router.get('/api/organizations/search', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const results = await Organization.search(q, 10);

    res.json(results.map(org => ({
      id: org._id,
      text: org.name,
      name: org.name,
      address: org.address || '',
      zipCode: org.zipCode || '',
      contactMethod: org.contactMethod || '',
      howHeardAboutUs: org.howHeardAboutUs || '',
      organizationType: org.organizationType || 'other'
    })));
  } catch (err) {
    console.error('Error searching organizations:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get organization by ID - GET /api/organizations/:id
router.get('/api/organizations/:id', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id).lean();
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({
      id: org._id,
      name: org.name,
      address: org.address || '',
      zipCode: org.zipCode || '',
      contactMethod: org.contactMethod || '',
      howHeardAboutUs: org.howHeardAboutUs || '',
      organizationType: org.organizationType || 'other',
      notes: org.notes || ''
    });
  } catch (err) {
    console.error('Error fetching organization:', err);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Create new organization - POST /api/organizations
router.post('/api/organizations', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const orgData = {
      name: req.body.name,
      address: req.body.address,
      zipCode: req.body.zipCode,
      contactMethod: req.body.contactMethod,
      howHeardAboutUs: req.body.howHeardAboutUs,
      organizationType: req.body.organizationType || 'other',
      notes: req.body.notes,
      createdBy: req.session.user._id
    };

    const org = await Organization.create(orgData);
    res.status(201).json({
      id: org._id,
      name: org.name,
      message: 'Organization created successfully'
    });
  } catch (err) {
    console.error('Error creating organization:', err);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD - GET /traveling-treehouse/dashboard
// Analytics dashboard with charts and statistics
// NOTE: Must be defined BEFORE /:id route to avoid route conflict
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/traveling-treehouse/dashboard', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    // Get all stops for analytics calculations
    const stops = await TravelingStop.find().lean();

    // Build 12-month rolling window for trend charts
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    );
    const monthLabels = months.map(d =>
      d.toLocaleString('default', { month: 'short', year: 'numeric' })
    );

    // Initialize monthly data arrays
    const monthlyStops = Array(12).fill(0);
    const monthlyBooks = Array(12).fill(0);

    // Populate monthly data from stops
    stops.forEach(stop => {
      const stopDate = new Date(stop.date);
      const monthIndex = months.findIndex(m =>
        m.getFullYear() === stopDate.getFullYear() && m.getMonth() === stopDate.getMonth()
      );
      if (monthIndex >= 0) {
        monthlyStops[monthIndex]++;
        monthlyBooks[monthIndex] += stop.booksDistributed;
      }
    });

    // Calculate statistics by stop type
    const statsByType = {};
    TravelingStop.STOP_TYPES.forEach(type => {
      const typeStops = stops.filter(s => s.stopType === type);
      statsByType[type] = {
        label: formatStopType(type),
        count: typeStops.length,
        totalBooks: typeStops.reduce((sum, s) => sum + s.booksDistributed, 0),
        avgBooks: typeStops.length > 0
          ? Math.round(typeStops.reduce((sum, s) => sum + s.booksDistributed, 0) / typeStops.length)
          : 0
      };
    });

    // Calculate top ZIP codes served
    const zipCounts = {};
    const zipBooks = {};
    stops.forEach(s => {
      zipCounts[s.stopZipCode] = (zipCounts[s.stopZipCode] || 0) + 1;
      zipBooks[s.stopZipCode] = (zipBooks[s.stopZipCode] || 0) + s.booksDistributed;
    });
    const topZipCodes = Object.entries(zipCounts)
      .map(([zip, count]) => ({ zip, count, books: zipBooks[zip] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Overall statistics
    const overallStats = {
      totalStops: stops.length,
      totalBooks: stops.reduce((sum, s) => sum + s.booksDistributed, 0),
      uniqueLocations: new Set(stops.map(s => s.stopName)).size,
      uniqueZipCodes: new Set(stops.map(s => s.stopZipCode)).size,
      avgBooksPerStop: stops.length > 0
        ? Math.round(stops.reduce((sum, s) => sum + s.booksDistributed, 0) / stops.length)
        : 0
    };

    res.render('travelingTreehouseDashboard', {
      user: req.session.user,
      monthLabels,
      monthlyStops,
      monthlyBooks,
      statsByType,
      topZipCodes,
      overallStats,
      stopTypes: TravelingStop.STOP_TYPES,
      formatStopType
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT CSV - GET /traveling-treehouse/export/csv
// Download filtered stops as CSV file
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/traveling-treehouse/export/csv', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const query = buildQueryFromParams(req.query);
    const stops = await TravelingStop.find(query).sort({ date: -1 }).lean();

    // CSV headers
    const headers = [
      'Date',
      'Stop Name',
      'Stop Type',
      'Address',
      'ZIP Code',
      'Books Distributed',
      'Contact Method',
      'How Heard About Us',
      'Did We Read To Them',
      'Sticker Displayed (Daycare)',
      'Signage Displayed (Branch)',
      'On Flyer (Event)',
      'Their Social Media (Event)',
      'Our Social Media (Event)',
      'Notes'
    ];

    // Build CSV rows - escape quotes by doubling them
    const rows = stops.map(s => [
      s.date,
      `"${(s.stopName || '').replace(/"/g, '""')}"`,
      formatStopType(s.stopType),
      `"${(s.stopAddress || '').replace(/"/g, '""')}"`,
      s.stopZipCode,
      s.booksDistributed,
      `"${(s.contactMethod || '').replace(/"/g, '""')}"`,
      `"${(s.howHeardAboutUs || '').replace(/"/g, '""')}"`,
      s.didWeReadToThem ? 'Yes' : 'No',
      s.daycareSettings?.hasStickerDisplayed ? 'Yes' : 'No',
      s.branchSettings?.hasSignageDisplayed ? 'Yes' : 'No',
      s.communityEventSettings?.wereWeOnFlyer ? 'Yes' : 'No',
      s.communityEventSettings?.featuredOnTheirSocialMedia ? 'Yes' : 'No',
      s.communityEventSettings?.didWeShareOnOurSocialMedia ? 'Yes' : 'No',
      `"${(s.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    // Generate filename with current date
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=traveling-treehouse-${dateStr}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT JSON - GET /traveling-treehouse/export/json
// Download filtered stops as JSON file
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/traveling-treehouse/export/json', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const query = buildQueryFromParams(req.query);
    const stops = await TravelingStop.find(query).sort({ date: -1 }).lean();

    // Generate filename with current date
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=traveling-treehouse-${dateStr}.json`);
    res.json({
      exportedAt: new Date().toISOString(),
      filters: req.query,
      count: stops.length,
      stops
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LIST - GET /traveling-treehouse
// Display all stops with filtering and summary statistics
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/traveling-treehouse', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const query = buildQueryFromParams(req.query);
    const stops = await TravelingStop.find(query)
      .sort({ date: -1 })
      .lean();

    // Calculate summary stats for filtered results
    const stats = {
      totalStops: stops.length,
      totalBooksDistributed: stops.reduce((sum, s) => sum + s.booksDistributed, 0),
      byType: {}
    };

    // Break down by stop type
    TravelingStop.STOP_TYPES.forEach(type => {
      const typeStops = stops.filter(s => s.stopType === type);
      stats.byType[type] = {
        label: formatStopType(type),
        count: typeStops.length,
        books: typeStops.reduce((sum, s) => sum + s.booksDistributed, 0)
      };
    });

    // Handle flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('travelingTreehouseList', {
      user: req.session.user,
      stops,
      stats,
      stopTypes: TravelingStop.STOP_TYPES,
      filters: {
        type: req.query.type || '',
        startDate: req.query.startDate || '',
        endDate: req.query.endDate || ''
      },
      formatStopType,
      success,
      error
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEW FORM - GET /traveling-treehouse/new
// Display form to create a new stop
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/traveling-treehouse/new', ensureStaffOrAdmin, (req, res) => {
  const error = req.session.error;
  delete req.session.error;

  res.render('travelingTreehouseForm', {
    user: req.session.user,
    stop: null,
    stopTypes: TravelingStop.STOP_TYPES,
    formatStopType,
    today: new Date().toISOString().slice(0, 10),
    error
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE - POST /traveling-treehouse
// Create a new stop record
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/traveling-treehouse', ensureStaffOrAdmin, stopValidation, async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.session.error = errors.array()[0].msg;
    return res.redirect('/traveling-treehouse/new');
  }

  try {
    // Handle organization creation/linking
    const organizationId = await handleOrganization(req.body, req.session.user._id);
    if (organizationId) {
      req.body.organizationId = organizationId;
    }

    const stopData = buildStopData(req.body, req.session.user._id);
    await TravelingStop.create(stopData);
    req.session.success = 'Stop recorded successfully!';
    res.redirect('/traveling-treehouse');
  } catch (err) {
    console.error('Error creating traveling stop:', err);
    req.session.error = 'Failed to create stop. Please try again.';
    res.redirect('/traveling-treehouse/new');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETAIL - GET /traveling-treehouse/:id
// Display detailed view of a single stop
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/traveling-treehouse/:id', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const stop = await TravelingStop.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!stop) {
      return res.status(404).render('404', { user: req.session.user });
    }

    const success = req.session.success;
    delete req.session.success;

    res.render('travelingTreehouseDetail', {
      user: req.session.user,
      stop,
      stopTypes: TravelingStop.STOP_TYPES,
      formatStopType,
      success
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT FORM - GET /traveling-treehouse/:id/edit
// Display form to edit an existing stop
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/traveling-treehouse/:id/edit', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const stop = await TravelingStop.findById(req.params.id).lean();

    if (!stop) {
      return res.status(404).render('404', { user: req.session.user });
    }

    const error = req.session.error;
    delete req.session.error;

    res.render('travelingTreehouseForm', {
      user: req.session.user,
      stop,
      stopTypes: TravelingStop.STOP_TYPES,
      formatStopType,
      today: new Date().toISOString().slice(0, 10),
      error
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE - POST /traveling-treehouse/:id
// Update an existing stop record
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/traveling-treehouse/:id', ensureStaffOrAdmin, stopValidation, async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.session.error = errors.array()[0].msg;
    return res.redirect(`/traveling-treehouse/${req.params.id}/edit`);
  }

  try {
    const stopData = buildStopData(req.body);
    await TravelingStop.findByIdAndUpdate(req.params.id, stopData);
    req.session.success = 'Stop updated successfully!';
    res.redirect(`/traveling-treehouse/${req.params.id}`);
  } catch (err) {
    console.error('Error updating traveling stop:', err);
    req.session.error = 'Failed to update stop. Please try again.';
    res.redirect(`/traveling-treehouse/${req.params.id}/edit`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - POST /traveling-treehouse/:id/delete
// Delete a stop record
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/traveling-treehouse/:id/delete', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    await TravelingStop.findByIdAndDelete(req.params.id);
    req.session.success = 'Stop deleted successfully!';
    res.redirect('/traveling-treehouse');
  } catch (err) {
    console.error('Error deleting traveling stop:', err);
    req.session.error = 'Failed to delete stop. Please try again.';
    res.redirect('/traveling-treehouse');
  }
});

module.exports = router;
