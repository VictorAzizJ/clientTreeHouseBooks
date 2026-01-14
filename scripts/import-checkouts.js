/**
 * Import book checkouts from Knack JSON export
 * Matches checkouts to existing members by email or first+last name
 * Usage: node scripts/import-checkouts.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');

// Import models
require('../models/Member');
require('../models/Checkout');
const Member = mongoose.model('Member');
const Checkout = mongoose.model('Checkout');

const JSON_FILE = 'C:/Users/Victo/Downloads/bookcheckout (3).json';

/**
 * Parse the identifier field to extract name and email
 * Formats:
 * - "FirstName LastName email@example.com"
 * - "FirstName LastName "
 * - "FirstName LastName MM/DD/YYYY" (child with DOB)
 */
function parseIdentifier(identifier) {
  if (!identifier) return null;

  const trimmed = identifier.trim();
  if (!trimmed) return null;

  // Check for email pattern at the end
  const emailMatch = trimmed.match(/^(.+?)\s+(\S+@\S+\.\S+)$/);
  if (emailMatch) {
    const namePart = emailMatch[1].trim();
    const email = emailMatch[2].toLowerCase();
    const nameParts = namePart.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    return { firstName, lastName, email };
  }

  // Check for date pattern at the end (MM/DD/YYYY) - indicates child
  const dateMatch = trimmed.match(/^(.+?)\s+(\d{2}\/\d{2}\/\d{4})$/);
  if (dateMatch) {
    const namePart = dateMatch[1].trim();
    const nameParts = namePart.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    return { firstName, lastName, email: null, isChild: true };
  }

  // Just name, no email
  const nameParts = trimmed.split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  return { firstName, lastName, email: null };
}

/**
 * Find member by email or name
 */
async function findMember(parsed) {
  if (!parsed) return null;

  // First try email match (most reliable)
  if (parsed.email) {
    const byEmail = await Member.findOne({
      email: parsed.email,
      isDeleted: { $ne: true }
    });
    if (byEmail) return byEmail;
  }

  // Then try exact first+last name match
  if (parsed.firstName && parsed.lastName) {
    const byName = await Member.findOne({
      firstName: { $regex: new RegExp(`^${escapeRegex(parsed.firstName)}$`, 'i') },
      lastName: { $regex: new RegExp(`^${escapeRegex(parsed.lastName)}$`, 'i') },
      isDeleted: { $ne: true }
    });
    if (byName) return byName;
  }

  return null;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse checkout date from Knack record
 */
function parseCheckoutDate(record) {
  if (record.field_21_raw && record.field_21_raw.iso_timestamp) {
    return new Date(record.field_21_raw.iso_timestamp);
  } else if (record.field_21) {
    return new Date(record.field_21);
  }
  return new Date();
}

/**
 * Safe number parser
 */
function safeNumber(val, defaultVal = 0) {
  if (val === null || val === undefined || val === '') return defaultVal;
  const num = parseFloat(val);
  return isNaN(num) ? defaultVal : num;
}

async function importCheckouts() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!\n');

    // Read JSON file
    console.log('Reading JSON file...');
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    const records = data.records;
    console.log(`Found ${records.length} checkout records to import\n`);

    let imported = 0;
    let skipped = 0;
    let unmatched = 0;
    let errors = 0;
    const unmatchedDetails = [];
    const errorDetails = [];

    // Process in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      for (const record of batch) {
        try {
          // Get the identifier from field_23_raw
          let identifier = null;
          if (record.field_23_raw && record.field_23_raw[0]) {
            identifier = record.field_23_raw[0].identifier;
          }

          if (!identifier) {
            skipped++;
            continue;
          }

          // Parse the identifier
          const parsed = parseIdentifier(identifier);
          if (!parsed || !parsed.firstName) {
            skipped++;
            continue;
          }

          // Find matching member
          const member = await findMember(parsed);
          if (!member) {
            unmatched++;
            if (unmatchedDetails.length < 50) {
              unmatchedDetails.push({
                identifier,
                firstName: parsed.firstName,
                lastName: parsed.lastName,
                email: parsed.email || 'N/A'
              });
            }
            continue;
          }

          // Parse checkout date
          const checkoutDate = parseCheckoutDate(record);

          // Get book category quantities
          const blackAuthorAdult = safeNumber(record.field_25_raw);
          const adult = safeNumber(record.field_26_raw);
          const blackAuthorKids = safeNumber(record.field_27_raw);
          const kids = safeNumber(record.field_28_raw);
          const boardBooks = safeNumber(record.field_377_raw);
          const totalBooks = safeNumber(record.field_91_raw);
          const totalWeight = safeNumber(record.field_574_raw);

          // Skip if no books
          if (totalBooks === 0 && blackAuthorAdult === 0 && adult === 0 &&
              blackAuthorKids === 0 && kids === 0 && boardBooks === 0) {
            skipped++;
            continue;
          }

          // Check for duplicate checkout (same member, same date, same book count)
          const startOfDay = new Date(checkoutDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(checkoutDate);
          endOfDay.setHours(23, 59, 59, 999);

          const existingCheckout = await Checkout.findOne({
            member: member._id,
            checkoutDate: { $gte: startOfDay, $lte: endOfDay },
            numberOfBooks: totalBooks
          });

          if (existingCheckout) {
            skipped++;
            continue;
          }

          // Create checkout record
          await Checkout.create({
            member: member._id,
            checkoutDate: checkoutDate,
            bookCategories: {
              blackAuthorAdult: { quantity: blackAuthorAdult },
              adult: { quantity: adult },
              blackAuthorKids: { quantity: blackAuthorKids },
              kids: { quantity: kids },
              boardBooks: { quantity: boardBooks }
            },
            totalWeight: totalWeight,
            numberOfBooks: totalBooks,
            notes: `Imported from Knack (ID: ${record.id})`
          });

          imported++;
        } catch (err) {
          errors++;
          if (errorDetails.length < 10) {
            errorDetails.push({
              record: record.id,
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
    console.log(`Skipped (duplicates/no books): ${skipped}`);
    console.log(`Unmatched (no member found): ${unmatched}`);
    console.log(`Errors: ${errors}`);

    if (unmatchedDetails.length > 0) {
      console.log(`\nUnmatched checkouts (first ${unmatchedDetails.length}):`);
      unmatchedDetails.slice(0, 20).forEach(u => {
        console.log(`  - ${u.firstName} ${u.lastName} (${u.email})`);
      });
      if (unmatchedDetails.length > 20) {
        console.log(`  ... and ${unmatchedDetails.length - 20} more`);
      }
    }

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

importCheckouts();
