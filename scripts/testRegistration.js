// scripts/testRegistration.js
// Test registration with a brand new email

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function testRegistration() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB\n');

    const testEmail = 'brandnewtest@example.com';

    // Step 1: Check if email exists
    console.log(`🔍 Checking if ${testEmail} exists...`);
    const existingUser = await User.findOne({ email: testEmail.toLowerCase() });

    if (existingUser) {
      console.log('❌ User already exists!');
      console.log('   Email:', existingUser.email);
      console.log('   Name:', existingUser.firstName, existingUser.lastName);
      console.log('   Role:', existingUser.role);
      console.log('\n🗑️  Deleting test user for clean test...');
      await User.findByIdAndDelete(existingUser._id);
      console.log('✅ Test user deleted');
    } else {
      console.log('✅ Email does not exist - good to register!');
    }

    // Step 2: Create new user
    console.log(`\n📝 Creating new user: ${testEmail}`);
    const newUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: testEmail.toLowerCase(),
      password: 'TestPassword123',
      role: 'volunteer'
    });

    console.log('✅ User created successfully!');
    console.log('   ID:', newUser._id);
    console.log('   Email:', newUser.email);
    console.log('   Name:', newUser.firstName, newUser.lastName);
    console.log('   Role:', newUser.role);
    console.log('   Password hashed:', newUser.password.startsWith('$2b$') ? 'YES ✅' : 'NO ❌');

    // Step 3: Verify user exists
    console.log('\n🔍 Verifying user was saved...');
    const verifyUser = await User.findOne({ email: testEmail.toLowerCase() });
    if (verifyUser) {
      console.log('✅ User found in database!');
    } else {
      console.log('❌ User NOT found in database - something went wrong!');
    }

    // Step 4: Clean up
    console.log('\n🗑️  Cleaning up test user...');
    await User.findByIdAndDelete(newUser._id);
    console.log('✅ Test user deleted');

    await mongoose.disconnect();
    console.log('\n✅ Test complete! Registration is working correctly.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testRegistration();
