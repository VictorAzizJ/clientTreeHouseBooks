// routes/login.js
const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const router = express.Router();

// GET /custom-login: Render the custom login form
router.get('/custom-login', (req, res) => {
  res.render('customLogin'); // See views/customLogin.ejs below
});

// POST /login: Process login form
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Call Okta's Authentication API to verify credentials
    const response = await axios.post(`https://${process.env.OKTA_DOMAIN}/api/v1/authn`, {
      username: email,
      password: password
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Extract the session token and user details from Okta's response
    const sessionToken = response.data.sessionToken;
    const oktaId = response.data._embedded.user.id;
    const firstName = response.data._embedded.user.profile.firstName;
    const lastName = response.data._embedded.user.profile.lastName;
    const oktaEmail = response.data._embedded.user.profile.login;

    // Look up the user in your local database using their Okta ID
    let user = await User.findOne({ oktaId });
    if (!user) {
      // If not found, create a new local user with default role "volunteer"
      user = await User.create({
        oktaId,
        firstName,
        lastName,
        email: oktaEmail,
        role: 'volunteer'
      });
    }
    // Store the user in session for later access (for dashboard routing)
    req.session.user = user;

    // Build the redirect URL to your dashboard
    const redirectUrl = `${process.env.APP_BASE_URL}/dashboard`;
    // Redirect to Okta's session cookie redirect endpoint
    res.redirect(`https://${process.env.OKTA_DOMAIN}/login/sessionCookieRedirect?token=${sessionToken}&redirectUrl=${encodeURIComponent(redirectUrl)}`);
  } catch (err) {
    console.error("Login error:", err.response ? err.response.data : err.message);
    res.status(400).send("Login failed: " + (err.response ? JSON.stringify(err.response.data) : err.message));
  }
});

module.exports = router;
