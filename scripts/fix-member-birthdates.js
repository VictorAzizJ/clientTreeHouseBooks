/**
 * Fix member dateOfBirth from Knack data
 * This script reads the Knack JSON export and looks for Birthdate fields
 * to populate the dateOfBirth field for members.
 *
 * Usage: node scripts/fix-member-birthdates.js [path-to-knack-json]
 * Example: node scripts/fix-member-birthdates.js "C:/Users/Victo/Downloads/person.json"
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');

// Import Member model
require('../models/Member');
const Member = mongoose.model('Member');

// JSON file path from command line or default
const JSON_FILE = process.argv[2] || 'C:/Users/Victo/Downloads/person (1).json';

// Helper to safely get string value
function safeString(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && val.formatted) return val.formatted;
  return '';
}

// Analyze the Knack JSON to find potential birthdate fields
function analyzeKnackFields(records) {
  console.log('\n=== Analyzing Knack Fields for Birthdate ===\n');

  if (records.length === 0) {
    console.log('No records found');
    return [];
  }

  const firstRecord = records[0];
  const potentialBirthdateFields = [];

  // Look for fields with "birth", "dob", "bday" in the name or containing date-like values
  for (const [key, value] of Object.entries(firstRecord)) {
    const keyLower = key.toLowerCase();

    // Check if field name suggests birthdate
    if (keyLower.includes('birth') || keyLower.includes('dob') || keyLower.includes('bday')) {
      potentialBirthdateFields.push({ field: key, value, reason: 'field name contains birth/dob/bday' });
    }
  }

  // Also scan all field values in the first few records to find date-like patterns
  console.log('Scanning first record for date fields...');
  for (const [key, value] of Object.entries(firstRecord)) {
    if (value && typeof value === 'string') {
      // Check if value looks like a date
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}/, // 2020-01-15
        /^\d{2}\/\d{2}\/\d{4}/, // 01/15/2020
        /^\d{1,2}\/\d{1,2}\/\d{2,4}/, // 1/15/20
      ];
      for (const pattern of datePatterns) {
        if (pattern.test(value)) {
          const existing = potentialBirthdateFields.find(p => p.field === key);
          if (!existing) {
            potentialBirthdateFields.push({ field: key, value, reason: 'contains date-like value' });
          }
          break;
        }
      }
    }
  }

  if (potentialBirthdateFields.length > 0) {
    console.log('\nPotential birthdate fields found:');
    potentialBirthdateFields.forEach(f => {
      console.log(`  ${f.field}: "${f.value}" (${f.reason})`);
    });
  } else {
    console.log('\nNo obvious birthdate fields found.');
    console.log('Listing all fields in first record:');
    for (const [key, value] of Object.entries(firstRecord)) {
      const displayValue = typeof value === 'object' ? JSON.stringify(value).slice(0, 50) : String(value).slice(0, 50);
      console.log(`  ${key}: ${displayValue}`);
    }
  }

  return potentialBirthdateFields;
}

// Extract birthdate from Knack record
function extractBirthdate(record) {
  // List of field names that might contain birthdate
  // Add any fields discovered during analysis
  const birthdateFields = [
    'Birthdate',
    'birthdate',
    'Birth Date',
    'birth_date',
    'DOB',
    'dob',
    'Date of Birth',
    'date_of_birth',
    // Raw field variants
    'Birthdate_raw',
    'birthdate_raw',
    'Birth Date_raw',
    'DOB_raw',
  ];

  // Also check Knack field IDs that might be birthdate
  const knackFieldIds = [
    'field_357', 'field_357_raw',  // Possible birthdate field
    'field_356', 'field_356_raw',
    'field_359', 'field_359_raw',
  ];

  const allFields = [...birthdateFields, ...knackFieldIds];

  for (const field of allFields) {
    if (record[field]) {
      let dateValue = record[field];

      // Handle raw object format
      if (typeof dateValue === 'object' && dateValue.date) {
        dateValue = dateValue.date;
      }
      if (typeof dateValue === 'object' && dateValue.formatted) {
        dateValue = dateValue.formatted;
      }

      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        // Sanity check: birthdate should be in the past and reasonable (not before 1900)
        const now = new Date();
        if (date < now && date.getFullYear() > 1900) {
          return { date, field };
        }
      }
    }
  }

  return null;
}

async function fixMemberBirthdates() {
  try {
    // Check if JSON file exists
    if (!fs.existsSync(JSON_FILE)) {
      console.error(`\nJSON file not found: ${JSON_FILE}`);
      console.log('\nUsage: node scripts/fix-member-birthdates.js "path/to/knack-export.json"');
      console.log('\nTo export from Knack:');
      console.log('1. Go to your Knack app');
      console.log('2. Navigate to the Person/Member table');
      console.log('3. Click Export > JSON');
      console.log('4. Save the file and provide the path to this script');
      process.exit(1);
    }

    // Read JSON file
    console.log('Reading Knack JSON file...');
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    const records = data.records;
    console.log(`Found ${records.length} records in Knack data`);

    // First, analyze the fields to find potential birthdate fields
    const birthdateFields = analyzeKnackFields(records);

    // Connect to MongoDB
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!\n');

    let updated = 0;
    let noBirthdateInKnack = 0;
    let notFound = 0;
    let alreadyHasDOB = 0;
    let errors = 0;

    const errorDetails = [];
    const sampleUpdates = [];

    console.log('Processing records...');

    // Process each Knack record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      try {
        // Get the Knack birthdate
        const birthdateResult = extractBirthdate(record);
        if (!birthdateResult) {
          noBirthdateInKnack++;
          continue;
        }

        const knackBirthdate = birthdateResult.date;

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

        // Skip if member already has a dateOfBirth
        if (member.dateOfBirth) {
          alreadyHasDOB++;
          continue;
        }

        // Update the dateOfBirth
        member.dateOfBirth = knackBirthdate;

        // If birthdate indicates they're under 18, mark as child
        const age = Math.floor((new Date() - knackBirthdate) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 18 && member.memberType === 'adult') {
          member.memberType = 'child';
        }

        await member.save();
        updated++;

        // Store sample updates for verification
        if (sampleUpdates.length < 10) {
          sampleUpdates.push({
            name: `${member.firstName} ${member.lastName}`,
            email: member.email || 'N/A',
            birthdate: knackBirthdate.toISOString().split('T')[0],
            age,
            sourceField: birthdateResult.field
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
    console.log(`Updated with birthdate: ${updated}`);
    console.log(`Already has DOB: ${alreadyHasDOB}`);
    console.log(`No birthdate in Knack: ${noBirthdateInKnack}`);
    console.log(`Member not found in DB: ${notFound}`);
    console.log(`Errors: ${errors}`);

    if (sampleUpdates.length > 0) {
      console.log('\nSample updates:');
      sampleUpdates.forEach(u => {
        console.log(`  ${u.name} (${u.email}): DOB=${u.birthdate}, Age=${u.age}, from field: ${u.sourceField}`);
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

fixMemberBirthdates();
