// routes/register.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User'); // Optional: for storing a local record

// GET /custom-signup: Render the custom sign-up form
router.get('/custom-signup', (req, res) => {
  res.render('customSignup');
});

// POST /register: Handle form submission and call Okta Users API
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Construct the payload according to Okta Users API (for OIE-enabled orgs)
  const payload = {
    profile: {
      firstName,
      lastName,
      email,
      login: email  // In Okta, login is typically the same as email
    },
    credentials: {
      password: { value: password }
    }
  };
  console.log('Okta Domain:', process.env.OKTA_DOMAIN);

  try {
    // Call the Okta Users API to create a new user (this is an admin call)
    const oktaResponse = await axios.post(
      `https://${process.env.OKTA_DOMAIN}/api/v1/users?activate=true`,
      payload,
      {
        headers: {
          'Authorization': `SSWS ${process.env.OKTA_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Optionally, create a local user record if you want to maintain a local database
    const oktaUser = oktaResponse.data;
    let localUser = await User.findOne({ oktaId: oktaUser.id });
    if (!localUser) {
      localUser = await User.create({
        oktaId: oktaUser.id,
        firstName: oktaUser.profile.firstName,
        lastName: oktaUser.profile.lastName,
        email: oktaUser.profile.email,
        role: 'volunteer'  // Default to volunteer; you can update this later
      });
    }

    // On success, redirect to a success page or the login page
    res.send("User registered successfully! You can now sign in.");
  } catch (err) {
    console.error("Error registering user:", err.response ? err.response.data : err.message);
    res.status(400).send("Registration failed: " + (err.response ? JSON.stringify(err.response.data) : err.message));
  }
});

module.exports = router;
