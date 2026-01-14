// scripts/createAdmin.js
// ═════════════════════════════════════════════════════════════════════════════
// CREATE ADMIN USER - Script to create an initial admin user
// ═════════════════════════════════════════════════════════════════════════════
//
// Usage:
//   node scripts/createAdmin.js
//
// This script creates an admin user with local authentication (bcrypt password).
// The password will be automatically hashed by the User model's pre-save hook.
//
// You can either:
// 1. Set environment variables: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME
// 2. Or edit the defaults below
//
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Create readline interface for interactive input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to ask questions
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Main function
async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected\n');

    // Get admin details (use env vars or prompt)
    const email = process.env.ADMIN_EMAIL || await question('Admin email: ');
    const firstName = process.env.ADMIN_FIRST_NAME || await question('First name: ');
    const lastName = process.env.ADMIN_LAST_NAME || await question('Last name: ');
    const password = process.env.ADMIN_PASSWORD || await question('Password (min 8 characters): ');

    // Validate password length
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      rl.close();
      mongoose.disconnect();
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingAdmin) {
      console.log(`\n⚠️  User with email ${email} already exists:`);
      console.log(`   Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Created: ${existingAdmin.createdAt}`);

      const update = await question('\nUpdate this user to admin role? (y/n): ');
      if (update.toLowerCase() === 'y') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ User role updated to admin');
      } else {
        console.log('Cancelled');
      }
    } else {
      // Create new admin
      // Password will be automatically hashed by User model pre-save hook
      const newAdmin = await User.create({
        email: email.toLowerCase().trim(),
        password: password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: 'admin'
      });

      console.log('\n✅ Admin user created successfully:');
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Name: ${newAdmin.firstName} ${newAdmin.lastName}`);
      console.log(`   Role: ${newAdmin.role}`);
      console.log(`   ID: ${newAdmin._id}`);
      console.log(`\n🔐 Password has been securely hashed with bcrypt`);
      console.log(`\nYou can now log in at: ${process.env.APP_BASE_URL || 'http://localhost:3000'}/custom-login`);
    }

    // Cleanup
    rl.close();
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    rl.close();
    mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
createAdmin();
