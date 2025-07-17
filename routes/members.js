// routes/members.js
const express  = require('express');
const router   = express.Router();
const Member   = require('../models/Member');
const Checkout = require('../models/Checkout');

// Middleware: Only staff or admin
function ensureAuthenticated(req, res, next) {
  const role = req.session.user?.role;
  if (role === 'staff' || role === 'admin') return next();
  res.status(403).send('Forbidden');
}

// 1. GET /members/new — form to add a new member
router.get('/members/new', ensureAuthenticated, (req, res) => {
  res.render('newMember', { user: req.session.user });
});

// 2. POST /members — create the member
router.post('/members', ensureAuthenticated, async (req, res) => {
  const { firstName, lastName, email, phone, address } = req.body;
  await Member.create({ firstName, lastName, email, phone, address });
  res.redirect('/members');  
});

// 3. GET /members — list all members
router.get('/members', ensureAuthenticated, async (req, res) => {
  const members = await Member.find().sort('lastName');
  res.render('membersList', { user: req.session.user, members });
});

// 4. GET /members/:id — show details + history
router.get('/members/:id', ensureAuthenticated, async (req, res) => {
  const member = await Member.findById(req.params.id);
  const history = await Checkout
    .find({ member: member._id })
    .sort('-checkoutOn');
  res.render('memberDetails', { user: req.session.user, member, history });
});

// 5. GET /members/search — JSON endpoint for the widget
router.get('/members/search', ensureAuthenticated, async (req, res) => {
  const q = req.query.q || '';
  const regex = new RegExp(q, 'i');
  const results = await Member
    .find({ $or: [{ firstName: regex }, { lastName: regex }, { email: regex }] })
    .limit(10);
  // return id + display text
  res.json(results.map(m => ({
    id: m._id,
    text: `${m.firstName} ${m.lastName} <${m.email}>`
  })));
});

module.exports = router;
