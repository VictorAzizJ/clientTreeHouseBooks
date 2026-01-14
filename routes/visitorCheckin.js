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

function ensureAdmin(req, res, next) {
  if (req.session.user?.role === 'admin') return next();
  res.status(403).send('Forbidden - Admin only');
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

    const { memberId, firstName, lastName, email, notes } = req.body;

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

// GET /visits - List all visits with pagination
router.get('/visits', ensureAuthenticated, async (req, res) => {
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
      query.visitDate = {};
      if (dateFrom) query.visitDate.$gte = new Date(dateFrom);
      if (dateTo) query.visitDate.$lte = new Date(dateTo + 'T23:59:59');
    }

    // Get total count for pagination
    const totalVisits = await Visit.countDocuments(query);
    const totalPages = Math.ceil(totalVisits / limit);

    // For CSV export, get all matching records
    const fetchLimit = format === 'csv' ? 0 : limit;
    const fetchSkip = format === 'csv' ? 0 : skip;

    // Fetch visits with pagination
    let visits = await Visit.find(query)
      .populate('member', 'firstName lastName email')
      .populate('recordedBy', 'firstName lastName')
      .sort({ visitDate: -1 })
      .skip(fetchSkip)
      .limit(fetchLimit || undefined)
      .lean();

    // Filter by member name if search provided (post-query for populated fields)
    if (search) {
      const searchLower = search.toLowerCase();
      visits = visits.filter(v =>
        v.member && (
          v.member.firstName?.toLowerCase().includes(searchLower) ||
          v.member.lastName?.toLowerCase().includes(searchLower) ||
          v.member.email?.toLowerCase().includes(searchLower)
        )
      );
    }

    // CSV Export
    if (format === 'csv') {
      const csvRows = [
        ['Date', 'Member Name', 'Email', 'Notes', 'Recorded By'].join(',')
      ];
      visits.forEach(v => {
        const memberName = v.member ? `${v.member.firstName} ${v.member.lastName}` : 'Unknown';
        const memberEmail = v.member?.email || '';
        const recordedBy = v.recordedBy ? `${v.recordedBy.firstName} ${v.recordedBy.lastName}` : '';
        csvRows.push([
          new Date(v.visitDate).toLocaleDateString(),
          `"${memberName}"`,
          memberEmail,
          `"${(v.notes || '').replace(/"/g, '""')}"`,
          `"${recordedBy}"`
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="visits-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvRows.join('\n'));
    }

    res.render('visitsList', {
      user: req.session.user,
      visits,
      pagination: {
        currentPage: page,
        totalPages,
        totalVisits,
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
    console.error('Error fetching visits:', err);
    res.status(500).send('Error loading visits');
  }
});

// GET /visits/:id/edit - Edit visit form (Admin only)
router.get('/visits/:id/edit', ensureAdmin, async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('member', 'firstName lastName email')
      .lean();

    if (!visit) {
      req.session.error = 'Visit not found';
      return res.redirect('/visits');
    }

    res.render('editVisit', {
      user: req.session.user,
      visit
    });
  } catch (err) {
    console.error('Error loading visit for edit:', err);
    req.session.error = 'Error loading visit';
    res.redirect('/visits');
  }
});

// POST /visits/:id/edit - Update visit (Admin only)
router.post('/visits/:id/edit', ensureAdmin, async (req, res) => {
  try {
    const { visitDate, notes } = req.body;

    const updateData = {
      notes: notes || undefined
    };

    if (visitDate) {
      updateData.visitDate = new Date(visitDate);
    }

    await Visit.findByIdAndUpdate(req.params.id, updateData);

    req.session.success = 'Visit updated successfully';
    res.redirect('/visits');
  } catch (err) {
    console.error('Error updating visit:', err);
    req.session.error = 'Error updating visit';
    res.redirect('/visits');
  }
});

// POST /visits/:id/delete - Delete visit (Admin only)
router.post('/visits/:id/delete', ensureAdmin, async (req, res) => {
  try {
    await Visit.findByIdAndDelete(req.params.id);
    req.session.success = 'Visit deleted successfully';
    res.redirect('/visits');
  } catch (err) {
    console.error('Error deleting visit:', err);
    req.session.error = 'Error deleting visit';
    res.redirect('/visits');
  }
});

module.exports = router;
