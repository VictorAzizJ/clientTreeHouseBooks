// routes/api.js
// API endpoints for AJAX requests

const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const Organization = require('../models/Organization');
const { ensureVolunteerOrHigher } = require('./_middleware');

// Search members by name or email (for autocomplete)
router.get('/api/members/search', ensureVolunteerOrHigher, async (req, res) => {
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
    const today = new Date();
    const formattedMembers = [];

    for (const m of members) {
      // Calculate age from DOB
      let age = null;
      let formattedDOB = null;
      if (m.dateOfBirth) {
        const dob = new Date(m.dateOfBirth);
        formattedDOB = `${String(dob.getMonth() + 1).padStart(2, '0')}/${String(dob.getDate()).padStart(2, '0')}/${dob.getFullYear()}`;

        // Calculate age
        age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
      }

      // Determine effective member type:
      // - No DOB = treat as adult
      // - Child who is 18+ = auto-transform to adult
      let effectiveMemberType = m.memberType || 'adult';
      if (!m.dateOfBirth) {
        effectiveMemberType = 'adult'; // No DOB = adult
      } else if (m.memberType === 'child' && age >= 18) {
        // Auto-transform child to adult (fire and forget)
        Member.checkAndTransformToAdult(m._id).catch(err => {
          console.error('Auto-transform error:', err);
        });
        effectiveMemberType = 'adult';
      }

      const isChild = effectiveMemberType === 'child';

      // Build display text:
      // - Children: show BIRTHDATE (MM/DD/YYYY)
      // - Adults: show email (no birthdate needed)
      let secondaryIdentifier = '';
      let subtext = '';

      if (isChild) {
        // Children show birthdate
        secondaryIdentifier = formattedDOB ? ` (DOB: ${formattedDOB})` : '';
        subtext = formattedDOB ? `DOB: ${formattedDOB}` : 'Child member';
      } else {
        // Adults show email (no birthdate)
        secondaryIdentifier = m.email ? ` <${m.email}>` : '';
        subtext = m.email || '';
      }

      formattedMembers.push({
        id: m._id,  // For Select2 compatibility
        _id: m._id,
        text: `${m.firstName} ${m.lastName}${secondaryIdentifier}`,  // For Select2
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email || '',
        phone: m.phone || '',
        dateOfBirth: isChild ? m.dateOfBirth : null,  // Only include DOB for children
        formattedDOB: isChild ? formattedDOB : null,  // Only for children
        age: isChild ? age : null,  // Only for children
        memberType: effectiveMemberType,
        isChild: isChild,
        // Pre-formatted display text for UI
        displayName: `${m.firstName} ${m.lastName}`,
        subtext: subtext
      });
    }

    res.json(formattedMembers);
  } catch (err) {
    console.error('Member search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Search organizations by name (for autocomplete)
router.get('/api/organizations/search', ensureVolunteerOrHigher, async (req, res) => {
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
