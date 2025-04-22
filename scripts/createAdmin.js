// Import required modules
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User'); // Adjust the path if necessary

// Load environment variables from .env file
dotenv.config();

// Define your admin profile details. You can either hard-code these here or use environment variables.
const adminProfile = {
  oktaId: process.env.ADMIN_OKTA_ID || 'admin-okta-id', // Set your admin's Okta ID or use a dummy value
  firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
  lastName: process.env.ADMIN_LAST_NAME || 'User',
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  role: 'admin' // This sets the role to admin
};

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('MongoDB connected');
    
    // Check if an admin with this email already exists
    let existingAdmin = await User.findOne({ email: adminProfile.email });
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin);
    } else {
      // Create a new admin record
      let newAdmin = await User.create(adminProfile);
      console.log('Admin created successfully:', newAdmin);
    }
    
    // Disconnect from the database after the operation
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });
