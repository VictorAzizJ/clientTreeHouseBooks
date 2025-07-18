// routes/checkouts.js
const express  = require('express');
const router   = express.Router();
const Member   = require('../models/Member');
const Checkout = require('../models/Checkout');

function ensureStaffOrAdmin(req, res, next) {
  const role = req.session.user?.role;
  if (role === 'staff' || role === 'admin') return next();
  res.status(403).send('Forbidden');
}

// GET all checkouts (optional, you can keep or remove)
router.get('/checkouts', ensureStaffOrAdmin, async (req, res) => {
  // ...
});

// POST create a checkout
router.post('/checkouts', ensureStaffOrAdmin, async (req, res) => {
  const { memberId, numberOfBooks, genres, weight, redirectTo } = req.body;
  const genreArray = Array.isArray(genres) ? genres : [genres];

  await Checkout.create({
    member:        memberId,
    numberOfBooks: parseInt(numberOfBooks, 10),
    genres:        genreArray,
    weight:        weight ? parseFloat(weight) : undefined
  });

  // Redirect back to either the supplied URL or the list
  if (redirectTo) {
    return res.redirect(redirectTo);
  }
  req.session.success = 'Checkout recorded successfully';
  res.redirect('/checkouts');
});

module.exports = router;
