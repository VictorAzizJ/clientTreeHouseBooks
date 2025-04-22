// routes/dashboard.js
const express = require('express');
const router = express.Router();

// Middleware to ensure user is authenticated (i.e. present in session)
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/custom-login');
}

// GET /dashboard: Render the appropriate dashboard view based on user role
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  const user = req.session.user;
  let view;
  if (user.role === 'admin') {
    view = 'dashboard-admin';
  } else if (user.role === 'staff') {
    view = 'dashboard-staff';
  } else {
    view = 'dashboard-volunteer';
  }
  res.render(view, { user });
});

module.exports = router;
