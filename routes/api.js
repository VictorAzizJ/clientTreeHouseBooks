// routes/api.js
// API endpoints for AJAX requests

const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const { ensureStaffOrAdmin } = require('./_middleware');

// Search members by name or email (for autocomplete)
router.get('/api/members/search', ensureStaffOrAdmin, async (req, res) => {
  try {
    const query = req.query.q || '';

    if (query.length < 2) {
      return res.json([]);
    }

    const members = await Member.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
    .select('firstName lastName email phone')
    .limit(20)
    .lean();

    res.json(members);
  } catch (err) {
    console.error('Member search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
