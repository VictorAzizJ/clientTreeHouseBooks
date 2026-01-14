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

function ensureAdmin(req, res, next) {
  if (req.session.user?.role === 'admin') return next();
  res.status(403).send('Forbidden - Admin only');
}

// GET /book-distribution - List all distributions with pagination
router.get('/book-distribution', ensureStaffOrAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const format = req.query.format; // 'csv' for export
    const search = req.query.search || '';
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    // Build query
    let query = {};
    if (dateFrom || dateTo) {
      query.eventDate = {};
      if (dateFrom) query.eventDate.$gte = new Date(dateFrom);
      if (dateTo) query.eventDate.$lte = new Date(dateTo + 'T23:59:59');
    }

    const totalDistributions = await BookDistribution.countDocuments(query);
    const totalPages = Math.ceil(totalDistributions / limit);

    // For CSV export, get all matching records
    const fetchLimit = format === 'csv' ? 0 : limit;
    const fetchSkip = format === 'csv' ? 0 : skip;

    let distributions = await BookDistribution.find(query)
      .populate('member', 'firstName lastName')
      .populate('organization', 'name')
      .populate('recordedBy', 'firstName lastName')
      .sort({ eventDate: -1 })
      .skip(fetchSkip)
      .limit(fetchLimit || undefined)
      .lean();

    // Post-query filtering for location/name search
    if (search) {
      const searchLower = search.toLowerCase();
      distributions = distributions.filter(d => {
        if (d.location && d.location.toLowerCase().includes(searchLower)) return true;
        if (d.eventName && d.eventName.toLowerCase().includes(searchLower)) return true;
        if (d.member) {
          const fullName = `${d.member.firstName} ${d.member.lastName}`.toLowerCase();
          if (fullName.includes(searchLower)) return true;
        }
        if (d.organization && d.organization.name && d.organization.name.toLowerCase().includes(searchLower)) {
          return true;
        }
        return false;
      });
    }

    // Calculate stats for the current view
    const stats = {
      totalBooks: distributions.reduce((sum, d) => sum + (d.totalBooks || 0), 0)
    };

    // CSV Export
    if (format === 'csv') {
      const csvRows = [
        ['Date', 'Event Name', 'Recipient Type', 'Recipient', 'Location', 'Books', 'Notes', 'Recorded By'].join(',')
      ];
      distributions.forEach(d => {
        let recipientName = '';
        if (d.member) {
          recipientName = `${d.member.firstName} ${d.member.lastName}`;
        } else if (d.organization) {
          recipientName = d.organization.name;
        }
        const recordedBy = d.recordedBy ? `${d.recordedBy.firstName} ${d.recordedBy.lastName}` : '';
        csvRows.push([
          new Date(d.eventDate).toLocaleDateString(),
          `"${(d.eventName || '').replace(/"/g, '""')}"`,
          d.recipientType || 'unknown',
          `"${recipientName}"`,
          `"${(d.location || '').replace(/"/g, '""')}"`,
          d.totalBooks || 0,
          `"${(d.notes || '').replace(/"/g, '""')}"`,
          `"${recordedBy}"`
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="distributions-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvRows.join('\n'));
    }

    // Get flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('bookDistributionList', {
      user: req.session.user,
      distributions,
      totalDistributions,
      stats,
      page,
      limit,
      totalPages,
      search,
      dateFrom: dateFrom || '',
      dateTo: dateTo || '',
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

// GET /book-distribution/:id/edit - Edit distribution form (Admin only)
router.get('/book-distribution/:id/edit', ensureAdmin, async (req, res) => {
  try {
    const distribution = await BookDistribution.findById(req.params.id)
      .populate('member', 'firstName lastName')
      .populate('organization', 'name')
      .lean();

    if (!distribution) {
      req.session.error = 'Distribution not found';
      return res.redirect('/book-distribution');
    }

    res.render('editBookDistribution', {
      user: req.session.user,
      distribution
    });
  } catch (err) {
    console.error('Error loading distribution for edit:', err);
    req.session.error = 'Error loading distribution';
    res.redirect('/book-distribution');
  }
});

// POST /book-distribution/:id/edit - Update distribution (Admin only)
router.post('/book-distribution/:id/edit', ensureAdmin, async (req, res) => {
  try {
    const { eventName, eventDate, totalBooks, notes } = req.body;

    const updateData = {
      eventName: eventName || undefined,
      totalBooks: parseInt(totalBooks) || 0,
      notes: notes || undefined
    };

    if (eventDate) {
      updateData.eventDate = new Date(eventDate);
    }

    await BookDistribution.findByIdAndUpdate(req.params.id, updateData);

    req.session.success = 'Distribution updated successfully';
    res.redirect('/book-distribution');
  } catch (err) {
    console.error('Error updating distribution:', err);
    req.session.error = 'Error updating distribution';
    res.redirect('/book-distribution');
  }
});

// POST /book-distribution/:id/delete - Delete distribution (Admin only)
router.post('/book-distribution/:id/delete', ensureAdmin, async (req, res) => {
  try {
    await BookDistribution.findByIdAndDelete(req.params.id);
    req.session.success = 'Distribution deleted successfully';
    res.redirect('/book-distribution');
  } catch (err) {
    console.error('Error deleting distribution:', err);
    req.session.error = 'Error deleting distribution';
    res.redirect('/book-distribution');
  }
});

module.exports = router;
