// services/dataImport.js
//
// ═══════════════════════════════════════════════════════════════════════════
// DATA IMPORT SERVICE
// ═══════════════════════════════════════════════════════════════════════════
//
// Handles bulk data imports from CSV files and external platforms (Knack).
// Supports validation, preview, error handling, and rollback.
//
// ═══════════════════════════════════════════════════════════════════════════

const { parse } = require('csv-parse/sync');
const Member = require('../models/Member');
const Checkout = require('../models/Checkout');
const Donation = require('../models/Donation');
const Program = require('../models/Program');
const Attendee = require('../models/Attendee');
const MetricValue = require('../models/MetricValue');
const ImportHistory = require('../models/ImportHistory');

/**
 * CSV Template definitions for each import type
 * Defines required and optional columns
 */
const CSV_TEMPLATES = {
  members: {
    required: ['firstName', 'lastName', 'email'],
    optional: ['phone', 'address', 'memberType', 'dateOfBirth', 'grade', 'school', 'parentEmail', 'notes'],
    example: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-1234',
      address: '123 Main St',
      memberType: 'adult',
      dateOfBirth: '2010-05-15',
      grade: '5',
      school: 'Lincoln Elementary',
      parentEmail: 'parent@example.com',
      notes: 'Allergic to peanuts'
    }
  },
  checkouts: {
    required: ['memberEmail', 'checkoutDate', 'numberOfBooks'],
    optional: ['genres', 'weight'],
    example: {
      memberEmail: 'john.doe@example.com',
      checkoutDate: '2024-01-15',
      numberOfBooks: '5',
      genres: 'Fiction,Science',
      weight: '2.5'
    }
  },
  donations: {
    required: ['memberEmail', 'donatedAt', 'numberOfBooks'],
    optional: ['condition', 'genres'],
    example: {
      memberEmail: 'jane.smith@example.com',
      donatedAt: '2024-01-10',
      numberOfBooks: '10',
      condition: 'Good',
      genres: 'Mystery,Biography'
    }
  },
  programs: {
    required: ['name'],
    optional: ['description', 'templateType', 'active'],
    example: {
      name: 'Summer Reading Program',
      description: 'Summer reading program for grades K-5',
      templateType: 'classroom',
      active: 'true'
    }
  },
  attendees: {
    required: ['programName', 'firstName', 'lastName'],
    optional: ['grade', 'dateOfBirth', 'school', 'email', 'phone', 'parentEmail'],
    example: {
      programName: 'After-School Reading',
      firstName: 'Sarah',
      lastName: 'Johnson',
      grade: '3',
      dateOfBirth: '2012-08-20',
      school: 'Washington Elementary',
      email: 'sarah.j@example.com',
      phone: '555-5678',
      parentEmail: 'parent@example.com'
    }
  }
};

/**
 * Parse CSV file content
 * @param {String} csvContent - Raw CSV content
 * @param {Object} options - Parsing options
 * @returns {Array} Parsed rows
 */
function parseCSV(csvContent, options = {}) {
  try {
    const records = parse(csvContent, {
      columns: true, // Use first row as column names
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true, // Allow variable column count
      ...options
    });
    return records;
  } catch (err) {
    throw new Error(`CSV parsing failed: ${err.message}`);
  }
}

/**
 * Validate CSV row against template
 * @param {Object} row - CSV row data
 * @param {String} importType - Type of import
 * @returns {Object} Validation result
 */
function validateRow(row, importType) {
  const template = CSV_TEMPLATES[importType];
  if (!template) {
    return { valid: false, errors: ['Unknown import type'] };
  }

  const errors = [];

  // Check required fields
  template.required.forEach(field => {
    if (!row[field] || row[field].trim() === '') {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Validate email format
  if (row.email && !isValidEmail(row.email)) {
    errors.push('Invalid email format');
  }
  if (row.memberEmail && !isValidEmail(row.memberEmail)) {
    errors.push('Invalid memberEmail format');
  }
  if (row.parentEmail && row.parentEmail !== '' && !isValidEmail(row.parentEmail)) {
    errors.push('Invalid parentEmail format');
  }

  // Validate dates
  if (row.dateOfBirth && !isValidDate(row.dateOfBirth)) {
    errors.push('Invalid dateOfBirth format (use YYYY-MM-DD)');
  }
  if (row.checkoutDate && !isValidDate(row.checkoutDate)) {
    errors.push('Invalid checkoutDate format (use YYYY-MM-DD)');
  }
  if (row.donatedAt && !isValidDate(row.donatedAt)) {
    errors.push('Invalid donatedAt format (use YYYY-MM-DD)');
  }

  // Validate numbers
  if (row.numberOfBooks && isNaN(parseInt(row.numberOfBooks))) {
    errors.push('numberOfBooks must be a number');
  }
  if (row.weight && row.weight !== '' && isNaN(parseFloat(row.weight))) {
    errors.push('weight must be a number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Preview CSV import
 * Parses and validates without saving to database
 * @param {String} csvContent - Raw CSV content
 * @param {String} importType - Type of import
 * @returns {Object} Preview results
 */
function previewImport(csvContent, importType) {
  const rows = parseCSV(csvContent);
  const preview = {
    totalRows: rows.length,
    validRows: 0,
    invalidRows: 0,
    errors: [],
    sample: rows.slice(0, 5), // First 5 rows
    columns: rows.length > 0 ? Object.keys(rows[0]) : []
  };

  rows.forEach((row, index) => {
    const validation = validateRow(row, importType);
    if (validation.valid) {
      preview.validRows++;
    } else {
      preview.invalidRows++;
      preview.errors.push({
        row: index + 2, // +2 because of 0-index and header row
        errors: validation.errors,
        data: row
      });
    }
  });

  return preview;
}

/**
 * Import members from CSV
 * @param {Array} rows - Parsed CSV rows
 * @param {ObjectId} userId - User performing import
 * @returns {Object} Import results
 */
async function importMembers(rows, userId) {
  const results = { successful: 0, failed: 0, errors: [], importedRecords: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      // Validate row
      const validation = validateRow(row, 'members');
      if (!validation.valid) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: validation.errors.join(', ') });
        continue;
      }

      // Check if member already exists
      const existing = await Member.findOne({ email: row.email.toLowerCase() });
      if (existing) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: 'Member with this email already exists' });
        continue;
      }

      // Find parent if parentEmail provided
      let parent = null;
      if (row.parentEmail && row.parentEmail !== '') {
        parent = await Member.findOne({ email: row.parentEmail.toLowerCase() });
      }

      // Create member
      const memberData = {
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        email: row.email.trim().toLowerCase(),
        phone: row.phone || undefined,
        address: row.address || undefined,
        memberType: row.memberType || 'adult',
        dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
        grade: row.grade || undefined,
        school: row.school || undefined,
        parent: parent?._id || undefined,
        notes: row.notes || undefined
      };

      const member = await Member.create(memberData);

      results.successful++;
      results.importedRecords.push({ model: 'Member', recordId: member._id });
    } catch (err) {
      results.failed++;
      results.errors.push({ row: i + 2, data: row, error: err.message });
    }
  }

  return results;
}

/**
 * Import checkouts from CSV
 * @param {Array} rows - Parsed CSV rows
 * @param {ObjectId} userId - User performing import
 * @returns {Object} Import results
 */
async function importCheckouts(rows, userId) {
  const results = { successful: 0, failed: 0, errors: [], importedRecords: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      const validation = validateRow(row, 'checkouts');
      if (!validation.valid) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: validation.errors.join(', ') });
        continue;
      }

      // Find member
      const member = await Member.findOne({ email: row.memberEmail.toLowerCase() });
      if (!member) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: `Member not found: ${row.memberEmail}` });
        continue;
      }

      // Create checkout
      const checkoutData = {
        member: member._id,
        checkoutDate: new Date(row.checkoutDate),
        numberOfBooks: parseInt(row.numberOfBooks),
        genres: row.genres ? row.genres.split(',').map(g => g.trim()) : [],
        weight: row.weight ? parseFloat(row.weight) : undefined
      };

      const checkout = await Checkout.create(checkoutData);

      results.successful++;
      results.importedRecords.push({ model: 'Checkout', recordId: checkout._id });
    } catch (err) {
      results.failed++;
      results.errors.push({ row: i + 2, data: row, error: err.message });
    }
  }

  return results;
}

/**
 * Import donations from CSV
 * @param {Array} rows - Parsed CSV rows
 * @param {ObjectId} userId - User performing import
 * @returns {Object} Import results
 */
async function importDonations(rows, userId) {
  const results = { successful: 0, failed: 0, errors: [], importedRecords: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      const validation = validateRow(row, 'donations');
      if (!validation.valid) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: validation.errors.join(', ') });
        continue;
      }

      const member = await Member.findOne({ email: row.memberEmail.toLowerCase() });
      if (!member) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: `Member not found: ${row.memberEmail}` });
        continue;
      }

      const donationData = {
        member: member._id,
        donatedAt: new Date(row.donatedAt),
        numberOfBooks: parseInt(row.numberOfBooks),
        condition: row.condition || undefined,
        genres: row.genres ? row.genres.split(',').map(g => g.trim()) : []
      };

      const donation = await Donation.create(donationData);

      results.successful++;
      results.importedRecords.push({ model: 'Donation', recordId: donation._id });
    } catch (err) {
      results.failed++;
      results.errors.push({ row: i + 2, data: row, error: err.message });
    }
  }

  return results;
}

/**
 * Import programs from CSV
 * @param {Array} rows - Parsed CSV rows
 * @param {ObjectId} userId - User performing import
 * @returns {Object} Import results
 */
async function importPrograms(rows, userId) {
  const results = { successful: 0, failed: 0, errors: [], importedRecords: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      const validation = validateRow(row, 'programs');
      if (!validation.valid) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: validation.errors.join(', ') });
        continue;
      }

      // Check if program already exists
      const existing = await Program.findOne({ name: row.name });
      if (existing) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: 'Program with this name already exists' });
        continue;
      }

      const programData = {
        name: row.name.trim(),
        description: row.description || undefined,
        templateType: row.templateType || 'custom',
        active: row.active === 'true' || row.active === '1' || row.active === 'yes'
      };

      const program = await Program.create(programData);

      results.successful++;
      results.importedRecords.push({ model: 'Program', recordId: program._id });
    } catch (err) {
      results.failed++;
      results.errors.push({ row: i + 2, data: row, error: err.message });
    }
  }

  return results;
}

/**
 * Import attendees from CSV
 * @param {Array} rows - Parsed CSV rows
 * @param {ObjectId} userId - User performing import
 * @returns {Object} Import results
 */
async function importAttendees(rows, userId) {
  const results = { successful: 0, failed: 0, errors: [], importedRecords: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      const validation = validateRow(row, 'attendees');
      if (!validation.valid) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: validation.errors.join(', ') });
        continue;
      }

      // Find program
      const program = await Program.findOne({ name: row.programName });
      if (!program) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: `Program not found: ${row.programName}` });
        continue;
      }

      // Find parent if provided
      let parent = null;
      if (row.parentEmail && row.parentEmail !== '') {
        parent = await Member.findOne({ email: row.parentEmail.toLowerCase() });
      }

      const attendeeData = {
        program: program._id,
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        grade: row.grade || undefined,
        dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
        school: row.school || undefined,
        email: row.email || undefined,
        phone: row.phone || undefined,
        parentMember: parent?._id || undefined
      };

      const attendee = await Attendee.create(attendeeData);

      // Auto-sync to member if program is classroom type
      if (program.templateType === 'classroom' && program.classroomSettings?.autoSyncAttendees) {
        const { syncAttendeeToMember } = require('./classroomTemplates');
        await syncAttendeeToMember(attendee, parent?._id);
      }

      results.successful++;
      results.importedRecords.push({ model: 'Attendee', recordId: attendee._id });
    } catch (err) {
      results.failed++;
      results.errors.push({ row: i + 2, data: row, error: err.message });
    }
  }

  return results;
}

/**
 * Execute full import
 * @param {String} csvContent - Raw CSV content
 * @param {String} importType - Type of import
 * @param {ObjectId} userId - User performing import
 * @param {String} fileName - Original filename
 * @returns {Object} Import history document
 */
async function executeImport(csvContent, importType, userId, fileName = 'upload.csv') {
  // Create import history record
  const importHistory = await ImportHistory.create({
    importType,
    importedBy: userId,
    source: 'csv',
    fileName,
    status: 'processing'
  });

  try {
    // Parse CSV
    const rows = parseCSV(csvContent);
    importHistory.stats.totalRows = rows.length;

    // Execute import based on type
    let results;
    switch (importType) {
      case 'members':
        results = await importMembers(rows, userId);
        break;
      case 'checkouts':
        results = await importCheckouts(rows, userId);
        break;
      case 'donations':
        results = await importDonations(rows, userId);
        break;
      case 'programs':
        results = await importPrograms(rows, userId);
        break;
      case 'attendees':
        results = await importAttendees(rows, userId);
        break;
      default:
        throw new Error('Unsupported import type');
    }

    // Update import history
    importHistory.stats.successful = results.successful;
    importHistory.stats.failed = results.failed;
    importHistory.errors = results.errors;
    importHistory.importedRecords = results.importedRecords;
    importHistory.status = 'completed';
    importHistory.completedAt = new Date();

    await importHistory.save();

    return importHistory;
  } catch (err) {
    importHistory.status = 'failed';
    importHistory.errors.push({ row: 0, error: err.message });
    importHistory.completedAt = new Date();
    await importHistory.save();

    throw err;
  }
}

/**
 * Rollback an import
 * Deletes all records created during the import
 * @param {ObjectId} importHistoryId - Import history ID
 * @returns {Object} Rollback results
 */
async function rollbackImport(importHistoryId) {
  const importHistory = await ImportHistory.findById(importHistoryId);
  if (!importHistory) {
    throw new Error('Import history not found');
  }

  if (importHistory.status === 'rolled_back') {
    throw new Error('Import already rolled back');
  }

  const results = { deleted: 0, errors: [] };

  for (const record of importHistory.importedRecords) {
    try {
      const Model = require(`../models/${record.model}`);
      await Model.findByIdAndDelete(record.recordId);
      results.deleted++;
    } catch (err) {
      results.errors.push({ model: record.model, recordId: record.recordId, error: err.message });
    }
  }

  importHistory.status = 'rolled_back';
  await importHistory.save();

  return results;
}

// Helper functions
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = {
  CSV_TEMPLATES,
  parseCSV,
  validateRow,
  previewImport,
  executeImport,
  rollbackImport,
  importMembers,
  importCheckouts,
  importDonations,
  importPrograms,
  importAttendees
};
