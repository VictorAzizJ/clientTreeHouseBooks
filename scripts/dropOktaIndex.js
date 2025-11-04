// scripts/dropOktaIndex.js
// Drop the old Okta index that's preventing new user registration

require('dotenv').config();
const mongoose = require('mongoose');

async function dropOktaIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB\n');

    const collection = mongoose.connection.collection('users');

    // List all indexes
    console.log('📋 Current indexes on users collection:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`   - ${index.name}:`, JSON.stringify(index.key));
    });

    // Check if oktaId index exists
    const oktaIndex = indexes.find(idx => idx.name === 'oktaId_1');

    if (oktaIndex) {
      console.log('\n⚠️  Found oktaId_1 index - this is causing registration failures!');
      console.log('🗑️  Dropping oktaId_1 index...');

      await collection.dropIndex('oktaId_1');

      console.log('✅ Successfully dropped oktaId_1 index!');

      // Verify it's gone
      console.log('\n📋 Remaining indexes:');
      const remainingIndexes = await collection.indexes();
      remainingIndexes.forEach(index => {
        console.log(`   - ${index.name}:`, JSON.stringify(index.key));
      });
    } else {
      console.log('\n✅ No oktaId index found - all good!');
    }

    await mongoose.disconnect();
    console.log('\n✅ Done! Registration should work now.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.codeName === 'IndexNotFound') {
      console.log('✅ Index already removed - no action needed!');
    }
    process.exit(1);
  }
}

dropOktaIndex();
