// scripts/checkUsers.js
// Quick script to check all users in the database

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    const users = await User.find({}).select('email firstName lastName role createdAt');

    console.log(`\n📊 Total users in database: ${users.length}\n`);

    if (users.length > 0) {
      console.log('Users:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} - ${user.firstName} ${user.lastName} (${user.role}) - Created: ${user.createdAt}`);
      });
    } else {
      console.log('No users found in database.');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
