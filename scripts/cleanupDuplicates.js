// scripts/cleanupDuplicates.js
// Remove duplicate users and keep only the most recent admin account

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function cleanupDuplicates() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB\n');

    // Find all users
    const allUsers = await User.find({}).sort({ createdAt: -1 });
    console.log(`📊 Found ${allUsers.length} users total\n`);

    // Group by email
    const emailGroups = {};
    allUsers.forEach(user => {
      const email = user.email.toLowerCase();
      if (!emailGroups[email]) {
        emailGroups[email] = [];
      }
      emailGroups[email].push(user);
    });

    // Find duplicates
    let duplicatesFound = false;
    for (const [email, users] of Object.entries(emailGroups)) {
      if (users.length > 1) {
        duplicatesFound = true;
        console.log(`⚠️  Found ${users.length} accounts with email: ${email}`);

        // Keep the most recent admin, or most recent user
        const adminUsers = users.filter(u => u.role === 'admin');
        const keepUser = adminUsers.length > 0 ? adminUsers[0] : users[0];

        console.log(`   ✅ Keeping: ${keepUser.firstName} ${keepUser.lastName} (${keepUser.role}) - ID: ${keepUser._id}`);

        // Mark others for deletion
        for (let i = 1; i < users.length; i++) {
          const user = users[i];
          console.log(`   ❌ Removing: ${user.firstName} ${user.lastName} (${user.role}) - ID: ${user._id}`);
          await User.findByIdAndDelete(user._id);
        }
        console.log('');
      }
    }

    if (!duplicatesFound) {
      console.log('✅ No duplicates found!');
    } else {
      console.log('✅ Cleanup complete!\n');

      // Show remaining users
      const remainingUsers = await User.find({}).sort({ email: 1 });
      console.log(`📊 Remaining users: ${remainingUsers.length}\n`);
      remainingUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} - ${user.firstName} ${user.lastName} (${user.role})`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupDuplicates();
