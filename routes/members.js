// routes/members.js
const express  = require('express');
const router   = express.Router();
const Member   = require('../models/Member');
const Checkout = require('../models/Checkout');
const Donation = require('../models/Donation');

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

// 1. GET /members/new — form to add a new member
router.get('/members/new', ensureStaffOrAdmin, (req, res) => {
  res.render('newMember', { user: req.session.user });
});

// 2. POST /members — create the member
router.post('/members', ensureStaffOrAdmin, async (req, res) => {
  const { firstName, lastName, email, phone, address } = req.body;
  await Member.create({ firstName, lastName, email, phone, address });
  req.session.success = 'Member created';
  res.redirect('/members');
});

// 3. GET /members — list all members
router.get('/members', ensureStaffOrAdmin, async (req, res) => {
  const members = await Member.find().sort('lastName').lean();
  res.render('membersList', { user: req.session.user, members });
});

// 4. GET /members/:id — show details + history
router.get('/members/:id', ensureStaffOrAdmin, async (req, res) => {
  const member = await Member.findById(req.params.id).lean();

  const checkoutHistory = await Checkout.find({ member: member._id })
    .sort('-checkoutDate')
    .lean();

  const donationHistory = await Donation.find({ member: member._id })
    .sort('-donatedAt')
    .lean();

  res.render('memberDetails', {
    user: req.session.user,
    member,
    checkoutHistory,
    donationHistory
  });
}); // <— this was missing

// 5. GET /members/search — JSON endpoint for autocomplete widgets
router.get('/members/search', ensureStaffOrAdmin, async (req, res) => {
  const q     = req.query.q || '';
  const regex = new RegExp(q, 'i');
  const results = await Member
    .find({
      $or: [
        { firstName: regex },
        { lastName:  regex },
        { email:     regex }
      ]
    })
    .limit(10)
    .lean();

  res.json(results.map(m => ({
    id:   m._id,
    text: `${m.firstName} ${m.lastName} <${m.email}>`
  })));
});

module.exports = router;

