const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');

// POST a new message
router.post('/messages', async (req, res) => {
  const user = req.session.user;
  if (!user || !['admin', 'staff'].includes(user.role)) return res.status(403).send('Unauthorized');

  const { recipientId, body } = req.body;
  if (!recipientId || !body) return res.status(400).send('Missing fields');

  await Message.create({ senderId: user._id, recipientId, body });
  req.session.success = 'Message sent!';
  res.redirect('/dashboard');
});

module.exports = router;
