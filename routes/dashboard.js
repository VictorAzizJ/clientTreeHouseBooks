// routes/dashboard.js
const express = require('express');
const router = express.Router();

// Middleware to ensure user is logged in
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/custom-login');
}

// GET /dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  const user = req.session.user;

  // ✅ Read and clear flash message
  const success = req.session.success;
  delete req.session.success;

  let view;
  if (user.role === 'admin') {
    view = 'dashboard-admin';
  } else if (user.role === 'staff') {
    view = 'dashboard-staff';
  } else {
    view = 'dashboard-volunteer';
  }

  res.render(view, { user, success });
});

module.exports = router;
