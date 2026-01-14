// routes/api.js
// API endpoints for AJAX requests

const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const Organization = require('../models/Organization');
const { ensureStaffOrAdmin } = require('./_middleware');

// Search members by name or email (for autocomplete)
router.get('/api/members/search', ensureStaffOrAdmin, async (req, res) => {
  try {
    const query = req.query.q || '';

    if (query.length < 2) {
      return res.json([]);
    }

    const regex = new RegExp(query, 'i');
    const members = await Member.find({
      isDeleted: { $ne: true },
      $or: [
        { firstName: regex },
        { lastName: regex },
        { email: regex }
      ]
    })
    .select('firstName lastName email phone')
    .sort({ lastName: 1, firstName: 1 })
    .limit(20)
    .lean();

    res.json(members);
  } catch (err) {
    console.error('Member search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Search organizations by name (for autocomplete)
router.get('/api/organizations/search', ensureStaffOrAdmin, async (req, res) => {
  try {
    const query = req.query.q || '';

    if (query.length < 2) {
      return res.json([]);
    }

    const regex = new RegExp(query, 'i');
    const organizations = await Organization.find({
      name: regex,
      $or: [
        { isActive: { $ne: false } },
        { isActive: { $exists: false } }
      ]
    })
    .select('name address zipCode organizationType')
    .limit(20)
    .lean();

    res.json(organizations.map(org => ({
      id: org._id,
      _id: org._id,
      text: org.name,
      name: org.name,
      address: org.address || '',
      zipCode: org.zipCode || '',
      organizationType: org.organizationType || 'other'
    })));
  } catch (err) {
    console.error('Organization search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
