const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// POST new announcement
router.post('/notifications', async (req, res) => {
  const user = req.session.user;
  if (!user || !['staff', 'admin'].includes(user.role)) return res.status(403).send('Unauthorized');

  const { title, body, targetRoles } = req.body;
  await Notification.create({
    title,
    body,
    senderId: user._id,
    senderRole: user.role,
    targetRoles: targetRoles || ['volunteer'] // default fallback
  });

  res.redirect('/dashboard');
});

// Existing route to acknowledge
router.post('/notifications/:id/acknowledge', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(403).send('Unauthorized');

  await Notification.findByIdAndUpdate(req.params.id, {
    $addToSet: { acknowledgedBy: user._id }
  });

  res.redirect('/dashboard');
});

module.exports = router;
