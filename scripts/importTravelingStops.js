#!/usr/bin/env node
// scripts/importTravelingStops.js
// ═══════════════════════════════════════════════════════════════════════════════
// Import Traveling Tree House stops from JSON file into MongoDB
//
// Usage:
//   node scripts/importTravelingStops.js [path-to-json-file]
//
// If no file path is provided, it will use scripts/sampleTravelingStops.json
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import the TravelingStop model
const TravelingStop = require('../models/TravelingStop');

// Get file path from command line argument or use default
const filePath = process.argv[2] || path.join(__dirname, 'sampleTravelingStops.json');

async function importData() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  TRAVELING TREE HOUSE - DATA IMPORT');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log();

  // Connect to MongoDB
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  // Read JSON file
  console.log(`\nReading data from: ${filePath}`);
  let data;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    data = JSON.parse(fileContent);
    console.log(`✅ Found ${data.length} records to import`);
  } catch (err) {
    console.error('❌ Failed to read JSON file:', err.message);
    await mongoose.connection.close();
    process.exit(1);
  }

  // Validate that data is an array
  if (!Array.isArray(data)) {
    console.error('❌ JSON file must contain an array of stop objects');
    await mongoose.connection.close();
    process.exit(1);
  }

  // Import records
  console.log('\nImporting records...');
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of data) {
    try {
      // Validate required fields
      if (!item.date || !item.stopName || !item.stopType || !item.stopAddress || !item.stopZipCode || item.booksDistributed === undefined) {
        console.log(`  ⚠️  Skipped: Missing required fields - ${item.stopName || 'Unknown'}`);
        skipped++;
        continue;
      }

      // Validate stop type
      if (!TravelingStop.STOP_TYPES.includes(item.stopType)) {
        console.log(`  ⚠️  Skipped: Invalid stop type "${item.stopType}" - ${item.stopName}`);
        skipped++;
        continue;
      }

      // Create the stop record
      await TravelingStop.create({
        date: item.date,
        stopName: item.stopName,
        stopType: item.stopType,
        stopAddress: item.stopAddress,
        stopZipCode: item.stopZipCode,
        booksDistributed: parseInt(item.booksDistributed, 10),
        contactMethod: item.contactMethod || '',
        howHeardAboutUs: item.howHeardAboutUs || '',
        didWeReadToThem: item.didWeReadToThem || false,
        daycareSettings: item.daycareSettings || { hasStickerDisplayed: false },
        branchSettings: item.branchSettings || { hasSignageDisplayed: false },
        communityEventSettings: item.communityEventSettings || {
          wereWeOnFlyer: false,
          featuredOnTheirSocialMedia: false,
          didWeShareOnOurSocialMedia: false
        },
        notes: item.notes || ''
      });

      console.log(`  ✅ Imported: ${item.stopName} (${item.date})`);
      imported++;
    } catch (err) {
      console.log(`  ❌ Error importing ${item.stopName || 'Unknown'}: ${err.message}`);
      errors++;
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  IMPORT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Total records in file: ${data.length}`);
  console.log(`  ✅ Successfully imported: ${imported}`);
  console.log(`  ⚠️  Skipped (validation): ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log('═══════════════════════════════════════════════════════════════════');

  // Get total count in database
  const totalInDb = await TravelingStop.countDocuments();
  console.log(`\n📊 Total Traveling Stops in database: ${totalInDb}`);

  // Close connection
  await mongoose.connection.close();
  console.log('\n✅ Done!');
}

// Run the import
importData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
