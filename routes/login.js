// routes/login.js
const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const router = express.Router();

// GET /custom-login: Render the login form
router.get('/custom-login', (req, res) => {
  const { error, email } = req.query;
  res.render('customLogin', { error, email });
});

// POST /login: Handle login with Okta
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Authenticate with Okta
    const response = await axios.post(`https://${process.env.OKTA_DOMAIN}/api/v1/authn`, {
      username: email,
      password: password
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const sessionToken = response.data.sessionToken;
    const oktaId = response.data._embedded.user.id;
    const firstName = response.data._embedded.user.profile.firstName;
    const lastName = response.data._embedded.user.profile.lastName;
    const oktaEmail = response.data._embedded.user.profile.login;

    // Lookup or create local user
    let user = await User.findOne({ oktaId });
    if (!user) {
      user = await User.create({
        oktaId,
        firstName,
        lastName,
        email: oktaEmail,
        role: 'volunteer'
      });
    }

    // Set session
    req.session.user = user;

    // ✅ Add flash success message
    req.session.success = `Welcome back, ${firstName}!`;

    // Redirect with session cookie
    const redirectUrl = `${process.env.APP_BASE_URL}/dashboard`;
    res.redirect(`https://${process.env.OKTA_DOMAIN}/login/sessionCookieRedirect?token=${sessionToken}&redirectUrl=${encodeURIComponent(redirectUrl)}`);
  } catch (err) {
    console.error("Login error:", err.response ? err.response.data : err.message);
    const errorMsg = encodeURIComponent('Invalid email or password.');
    const enteredEmail = encodeURIComponent(req.body.email);
    res.redirect(`/custom-login?error=${errorMsg}&email=${enteredEmail}`);
  }
});

module.exports = router;
