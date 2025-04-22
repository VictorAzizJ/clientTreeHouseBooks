// routes/index.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  // Render index.ejs and pass user if available
  res.render('index', { user: req.session.user });
});

module.exports = router;

