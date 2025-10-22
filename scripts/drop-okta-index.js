// scripts/drop-okta-index.js
// Migration script to remove the oktaId index from the users collection
// This fixes the duplicate key error when creating new users

require('dotenv').config();
const mongoose = require('mongoose');

async function dropOktaIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // List all indexes
    console.log('\nCurrent indexes on users collection:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Try to drop the oktaId index
    try {
      await usersCollection.dropIndex('oktaId_1');
      console.log('\n✅ Successfully dropped oktaId_1 index');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('\n⚠️  oktaId_1 index does not exist (already removed or never existed)');
      } else {
        throw error;
      }
    }

    // List indexes after drop
    console.log('\nIndexes after migration:');
    const newIndexes = await usersCollection.indexes();
    newIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    console.log('\n✅ Migration completed successfully');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
dropOktaIndex();
