const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// POST new announcement
router.post('/notifications', async (req, res) => {
  const user = req.session.user;
  if (!user || !['staff', 'admin'].includes(user.role)) return res.status(403).send('Unauthorized');

  const { title, body } = req.body;
  let { targetRoles } = req.body;

  // Handle targetRoles - ensure it's an array
  if (!targetRoles) {
    targetRoles = ['volunteer']; // default fallback
  } else if (!Array.isArray(targetRoles)) {
    targetRoles = [targetRoles]; // single checkbox selected
  }

  await Notification.create({
    title,
    body,
    senderId: user._id,
    senderRole: user.role,
    targetRoles
  });

  req.session.success = 'Announcement sent successfully!';
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
