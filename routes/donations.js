// src/routes/donations.js
const express   = require('express');
const router    = express.Router();
const Donation  = require('../models/Donation');
const Member    = require('../models/Member');
const { ensureAuthenticated } = require('./_middleware');

// Show form to record a donation for a given member
router.get('/members/:memberId/donations/new', ensureAuthenticated, async (req, res) => {
  const member = await Member.findById(req.params.memberId).lean();
  if (!member) return res.status(404).send('Member not found');
  res.render('newDonation', { user: req.session.user, member });
});

// Handle donation submission
router.post('/members/:memberId/donations', ensureAuthenticated, async (req, res) => {
  const { numberOfBooks, genres, weight } = req.body;
  const genreArray = Array.isArray(genres) ? genres : [genres];
  await Donation.create({
    member:        req.params.memberId,
    numberOfBooks: parseInt(numberOfBooks, 10),
    genres:        genreArray,
    weight:        weight ? parseFloat(weight) : undefined
  });
  req.session.success = 'Donation recorded';
  res.redirect(`/members/${req.params.memberId}`);
});

module.exports = router;
