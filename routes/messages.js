const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');

// POST a new message
router.post('/messages', async (req, res) => {
  const user = req.session.user;
  if (!user || !['admin', 'staff'].includes(user.role)) return res.status(403).send('Unauthorized');

  const { recipientId, body } = req.body;
  if (!recipientId || !body) {
    req.session.error = 'Please select a recipient and enter a message.';
    return res.redirect('/dashboard');
  }

  try {
    await Message.create({ senderId: user._id, recipientId, body });
    req.session.success = 'Message sent successfully!';
  } catch (err) {
    req.session.error = 'Failed to send message. Please try again.';
  }
  res.redirect('/dashboard');
});

module.exports = router;
