/**
 * Import members from Knack JSON export
 * Usage: node scripts/import-members.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');

// Import Member model
require('../models/Member');
const Member = mongoose.model('Member');

const JSON_FILE = 'C:/Users/Victo/Downloads/person (1).json';

// Helper to safely get string value
function safeString(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && val.formatted) return val.formatted;
  return '';
}

// Field mappings from Knack to our Member model
function mapKnackToMember(record) {
  // Extract email from raw field
  let email = null;
  if (record.field_4_raw && record.field_4_raw.email) {
    email = record.field_4_raw.email.trim().toLowerCase();
  }

  // Parse join date
  let joinedAt = null;
  if (record.field_358_raw) {
    joinedAt = new Date(record.field_358_raw);
  } else if (record.field_380_raw) {
    joinedAt = new Date(record.field_380_raw);
  }

  // Get address - prefer field_77 (street only), fallback to field_75
  let address = safeString(record.field_77_raw) || safeString(record.field_77) || '';
  if (!address && record.field_75) {
    // field_75 has HTML line breaks, clean it up
    address = safeString(record.field_75).replace(/<br\s*\/?>/gi, ', ');
  }

  // Get zip code
  const zipCode = safeString(record.field_81_raw) || safeString(record.field_81) ||
                  safeString(record.field_379_raw) || safeString(record.field_379) || '';

  // Get phone safely (handle object format)
  const phone = safeString(record.field_3_raw) || safeString(record.field_3) || '';

  return {
    firstName: safeString(record.field_10_raw) || safeString(record.field_10) || 'Unknown',
    lastName: safeString(record.field_11_raw) || safeString(record.field_11) || 'Unknown',
    email: email || undefined, // undefined so mongoose won't set empty string
    phone: phone || undefined,
    address: address || undefined,
    zipCode: zipCode || undefined,
    notes: safeString(record.field_265_raw) || safeString(record.field_265) || undefined,
    joinedAt: joinedAt && !isNaN(joinedAt) ? joinedAt : new Date(),
    memberType: 'adult', // Default to adult, can be updated later
    _knackId: record.id // Store original ID for reference
  };
}

async function importMembers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!\n');

    // Fix the email index to be sparse (allow multiple nulls)
    console.log('Fixing email index...');
    try {
      await Member.collection.dropIndex('email_1');
      console.log('Dropped old email index');
    } catch (e) {
      // Index might not exist, that's fine
      console.log('No existing email index to drop');
    }
    await Member.collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    console.log('Created new sparse email index\n');

    // Read JSON file
    console.log('Reading JSON file...');
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    const records = data.records;
    console.log(`Found ${records.length} records to import\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails = [];

    // Process in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      for (const record of batch) {
        try {
          const memberData = mapKnackToMember(record);

          // Skip if no first and last name
          if (!memberData.firstName && !memberData.lastName) {
            skipped++;
            continue;
          }

          // Check for existing member by email (if email exists)
          if (memberData.email) {
            const existing = await Member.findOne({ email: memberData.email });
            if (existing) {
              skipped++;
              continue;
            }
          }

          // Create new member
          const member = new Member(memberData);
          await member.save();
          imported++;
        } catch (err) {
          errors++;
          if (errorDetails.length < 10) {
            errorDetails.push({
              record: record.field_541 || record.id,
              error: err.message
            });
          }
        }
      }

      // Progress update
      const progress = Math.min(i + BATCH_SIZE, records.length);
      process.stdout.write(`\rProcessed ${progress}/${records.length} (${Math.round(progress/records.length*100)}%)`);
    }

    console.log('\n\n=== Import Complete ===');
    console.log(`Imported: ${imported}`);
    console.log(`Skipped (duplicates/invalid): ${skipped}`);
    console.log(`Errors: ${errors}`);

    if (errorDetails.length > 0) {
      console.log('\nSample errors:');
      errorDetails.forEach(e => console.log(`  - ${e.record}: ${e.error}`));
    }

  } catch (err) {
    console.error('Import failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

importMembers();
