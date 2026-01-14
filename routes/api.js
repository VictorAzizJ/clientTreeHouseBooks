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

    // Split query into parts for full name search
    const queryParts = query.trim().split(/\s+/);
    const regex = new RegExp(query, 'i');

    let searchConditions;

    if (queryParts.length >= 2) {
      // Multi-word search: try first+last name combinations
      const firstPart = new RegExp(queryParts[0], 'i');
      const lastPart = new RegExp(queryParts.slice(1).join(' '), 'i');
      const lastPartAlt = new RegExp(queryParts[queryParts.length - 1], 'i');

      searchConditions = {
        isDeleted: { $ne: true },
        $or: [
          // First name + last name (in order)
          { $and: [{ firstName: firstPart }, { lastName: lastPart }] },
          { $and: [{ firstName: firstPart }, { lastName: lastPartAlt }] },
          // Last name + first name (reversed)
          { $and: [{ lastName: firstPart }, { firstName: lastPart }] },
          // Single field matches
          { firstName: regex },
          { lastName: regex },
          { email: regex }
        ]
      };
    } else {
      // Single word search
      searchConditions = {
        isDeleted: { $ne: true },
        $or: [
          { firstName: regex },
          { lastName: regex },
          { email: regex }
        ]
      };
    }

    const members = await Member.find(searchConditions)
      .select('firstName lastName email phone dateOfBirth')
      .sort({ lastName: 1, firstName: 1 })
      .limit(20)
      .lean();

    // Format response with additional display info
    const formattedMembers = members.map(m => ({
      _id: m._id,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email || '',
      phone: m.phone || '',
      dateOfBirth: m.dateOfBirth || null,
      // Pre-formatted display text for UI
      displayName: `${m.firstName} ${m.lastName}`,
      subtext: [
        m.email,
        m.dateOfBirth ? `DOB: ${new Date(m.dateOfBirth).toLocaleDateString()}` : null
      ].filter(Boolean).join(' | ')
    }));

    res.json(formattedMembers);
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
