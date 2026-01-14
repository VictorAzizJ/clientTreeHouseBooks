/**
 * Fix member joinedAt dates to reflect original Knack signup dates
 * This script reads the Knack JSON export and updates existing members
 * with their original signup dates instead of the import date.
 *
 * Usage: node scripts/fix-member-joindates.js
 * For production: MONGO_URI="mongodb+srv://..." node scripts/fix-member-joindates.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');

// Allow passing MONGO_URI as command line argument: node script.js "mongodb://..."
const PRODUCTION_URI = process.argv[2] || process.env.MONGO_URI;

// Import Member model
require('../models/Member');
const Member = mongoose.model('Member');

// Default JSON file path - update if needed
const JSON_FILE = 'C:/Users/Victo/Downloads/person (1).json';

// Helper to safely get string value
function safeString(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && val.formatted) return val.formatted;
  return '';
}

// Extract date from Knack record - try multiple date fields
function extractJoinDate(record) {
  // Try various date fields that might contain signup/join date
  const dateFields = [
    'field_358_raw',  // Likely signup date field
    'field_380_raw',  // Alternate date field
    'field_358',
    'field_380'
  ];

  for (const field of dateFields) {
    if (record[field]) {
      const date = new Date(record[field]);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

async function fixMemberJoinDates() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    console.log(`Database: ${PRODUCTION_URI?.includes('ycijim') ? 'PRODUCTION' : 'LOCAL'}`);
    await mongoose.connect(PRODUCTION_URI);
    console.log('Connected!\n');

    // Check if JSON file exists
    if (!fs.existsSync(JSON_FILE)) {
      console.error(`JSON file not found: ${JSON_FILE}`);
      console.log('Please update the JSON_FILE path in this script.');
      process.exit(1);
    }

    // Read JSON file
    console.log('Reading Knack JSON file...');
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    const records = data.records;
    console.log(`Found ${records.length} records in Knack data\n`);

    let updated = 0;
    let noDateInKnack = 0;
    let notFound = 0;
    let alreadyCorrect = 0;
    let errors = 0;

    const errorDetails = [];
    const sampleUpdates = [];

    // Process each Knack record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      try {
        // Get the Knack join date
        const knackJoinDate = extractJoinDate(record);
        if (!knackJoinDate) {
          noDateInKnack++;
          continue;
        }

        // Get member identifying info
        const email = record.field_4_raw?.email?.trim().toLowerCase() || null;
        const firstName = safeString(record.field_10_raw) || safeString(record.field_10);
        const lastName = safeString(record.field_11_raw) || safeString(record.field_11);

        // Find the member in our database
        let member = null;

        // First try by email (most reliable)
        if (email) {
          member = await Member.findOne({ email });
        }

        // If not found by email, try by exact name match
        if (!member && firstName && lastName) {
          member = await Member.findOne({
            firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
            lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
          });
        }

        if (!member) {
          notFound++;
          continue;
        }

        // Check if the joinedAt is already correct (within 1 day)
        const existingDate = new Date(member.joinedAt);
        const timeDiff = Math.abs(existingDate.getTime() - knackJoinDate.getTime());
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

        if (daysDiff < 1) {
          alreadyCorrect++;
          continue;
        }

        // Update the joinedAt date
        const oldDate = member.joinedAt;
        member.joinedAt = knackJoinDate;
        await member.save();
        updated++;

        // Store sample updates for verification
        if (sampleUpdates.length < 5) {
          sampleUpdates.push({
            name: `${member.firstName} ${member.lastName}`,
            email: member.email || 'N/A',
            oldDate: oldDate?.toISOString().split('T')[0] || 'N/A',
            newDate: knackJoinDate.toISOString().split('T')[0]
          });
        }

      } catch (err) {
        errors++;
        if (errorDetails.length < 5) {
          errorDetails.push({
            record: record.id,
            error: err.message
          });
        }
      }

      // Progress update every 500 records
      if ((i + 1) % 500 === 0 || i === records.length - 1) {
        process.stdout.write(`\rProcessed ${i + 1}/${records.length} records (${Math.round((i + 1) / records.length * 100)}%)`);
      }
    }

    console.log('\n\n=== Update Complete ===');
    console.log(`Updated: ${updated}`);
    console.log(`Already correct: ${alreadyCorrect}`);
    console.log(`No date in Knack: ${noDateInKnack}`);
    console.log(`Member not found: ${notFound}`);
    console.log(`Errors: ${errors}`);

    if (sampleUpdates.length > 0) {
      console.log('\nSample updates:');
      sampleUpdates.forEach(u => {
        console.log(`  ${u.name} (${u.email}): ${u.oldDate} → ${u.newDate}`);
      });
    }

    if (errorDetails.length > 0) {
      console.log('\nSample errors:');
      errorDetails.forEach(e => console.log(`  - ${e.record}: ${e.error}`));
    }

  } catch (err) {
    console.error('Script failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixMemberJoinDates();
