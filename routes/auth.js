// Import Express and create a router instance
const express = require('express');
const router = express.Router();

// Custom Logout Route: This route logs out the user and redirects them to the landing page.
router.get('/logout', (req, res) => {
  // Call the logout method provided by the OIDC middleware to clear the session.
  req.logout();
  res.redirect('/');
});

router.get('/signup', (req, res) => {
    res.render('signup');
  });

// Export the router to be mounted in server.js
module.exports = router;
