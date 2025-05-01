const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

router.post('/notifications/:id/acknowledge', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(403).send('Unauthorized');

  await Notification.findByIdAndUpdate(req.params.id, {
    $addToSet: { acknowledgedBy: user._id }
  });

  res.redirect('/dashboard');
});

module.exports = router;
