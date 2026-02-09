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
    const memberType = req.query.memberType; // Optional filter: 'adult' or 'child'

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

    // Apply memberType filter if specified
    if (memberType) {
      searchConditions.memberType = memberType;
    }

    const members = await Member.find(searchConditions)
      .select('firstName lastName email phone dateOfBirth memberType')
      .sort({ lastName: 1, firstName: 1 })
      .limit(20)
      .lean();

    // Format response with additional display info
    // Includes both id/text (for Select2) and _id/displayName (for general use)
    const formattedMembers = members.map(m => {
      const isChild = m.memberType === 'child';

      // Format DOB as MM/DD/YYYY for children
      let formattedDOB = null;
      if (m.dateOfBirth) {
        const dob = new Date(m.dateOfBirth);
        formattedDOB = `${String(dob.getMonth() + 1).padStart(2, '0')}/${String(dob.getDate()).padStart(2, '0')}/${dob.getFullYear()}`;
      }

      // Build display text: children show DOB, adults show email
      let secondaryIdentifier = '';
      if (isChild) {
        secondaryIdentifier = formattedDOB ? ` (DOB: ${formattedDOB})` : ' (Child)';
      } else {
        secondaryIdentifier = m.email ? ` <${m.email}>` : '';
      }

      // Build subtext: children prioritize DOB, adults prioritize email
      let subtext;
      if (isChild) {
        subtext = formattedDOB ? `DOB: ${formattedDOB}` : 'Child member';
      } else {
        subtext = [
          m.email,
          formattedDOB ? `DOB: ${formattedDOB}` : null
        ].filter(Boolean).join(' | ');
      }

      return {
        id: m._id,  // For Select2 compatibility
        _id: m._id,
        text: `${m.firstName} ${m.lastName}${secondaryIdentifier}`,  // For Select2
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email || '',
        phone: m.phone || '',
        dateOfBirth: m.dateOfBirth || null,
        formattedDOB: formattedDOB,  // Pre-formatted MM/DD/YYYY
        memberType: m.memberType || 'adult',
        isChild: isChild,
        // Pre-formatted display text for UI
        displayName: `${m.firstName} ${m.lastName}`,
        subtext: subtext
      };
    });

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
    .select('name address zipCode phone email contactName organizationType')
    .limit(20)
    .lean();

    res.json(organizations.map(org => {
      // Build subtext with available contact info
      const subtextParts = [];
      if (org.email) subtextParts.push(org.email);
      if (org.phone) subtextParts.push(org.phone);
      if (org.contactName) subtextParts.push(`Contact: ${org.contactName}`);

      return {
        id: org._id,
        _id: org._id,
        text: org.name,
        name: org.name,
        address: org.address || '',
        zipCode: org.zipCode || '',
        phone: org.phone || '',
        email: org.email || '',
        contactName: org.contactName || '',
        organizationType: org.organizationType || 'other',
        subtext: subtextParts.join(' | ')
      };
    }));
  } catch (err) {
    console.error('Organization search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
