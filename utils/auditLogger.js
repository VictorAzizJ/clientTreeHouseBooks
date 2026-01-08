// utils/auditLogger.js
const AuditLog = require('../models/AuditLog');

/**
 * Audit Logger Utility
 * Provides helper functions to log all record changes for audit trail.
 */

/**
 * Log a record creation
 * @param {string} modelName - The model name (e.g., 'Member', 'Donation')
 * @param {Object} record - The created record
 * @param {string} userId - The ID of the user who created the record
 */
async function logCreate(modelName, record, userId) {
  try {
    await AuditLog.create({
      modelName,
      recordId: record._id,
      action: 'create',
      performedBy: userId,
      changedFields: Object.keys(record.toObject ? record.toObject() : record),
      previousValues: {},
      newValues: sanitizeValues(record.toObject ? record.toObject() : record),
      summary: `Created new ${modelName} record`
    });
  } catch (err) {
    console.error('Audit log error (create):', err.message);
  }
}

/**
 * Log a record update
 * @param {string} modelName - The model name
 * @param {string} recordId - The record's ID
 * @param {Object} oldValues - The values before update
 * @param {Object} newValues - The values after update
 * @param {string} userId - The ID of the user who made the update
 */
async function logUpdate(modelName, recordId, oldValues, newValues, userId) {
  try {
    // Find which fields actually changed
    const changedFields = [];
    const prevVals = {};
    const newVals = {};

    const oldObj = oldValues.toObject ? oldValues.toObject() : oldValues;
    const newObj = newValues.toObject ? newValues.toObject() : newValues;

    // Compare fields to find changes
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      // Skip internal mongoose fields
      if (key.startsWith('_') || key === '__v') continue;

      const oldVal = oldObj[key];
      const newVal = newObj[key];

      // Check if values are different
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changedFields.push(key);
        prevVals[key] = oldVal;
        newVals[key] = newVal;
      }
    }

    // Only log if something actually changed
    if (changedFields.length > 0) {
      await AuditLog.create({
        modelName,
        recordId,
        action: 'update',
        performedBy: userId,
        changedFields,
        previousValues: sanitizeValues(prevVals),
        newValues: sanitizeValues(newVals),
        summary: `Updated ${changedFields.length} field(s): ${changedFields.join(', ')}`
      });
    }
  } catch (err) {
    console.error('Audit log error (update):', err.message);
  }
}

/**
 * Log a record deletion (soft delete)
 * @param {string} modelName - The model name
 * @param {string} recordId - The record's ID
 * @param {string} userId - The ID of the user who deleted the record
 * @param {Object} recordSnapshot - Optional snapshot of the record at deletion time
 */
async function logDelete(modelName, recordId, userId, recordSnapshot = {}) {
  try {
    await AuditLog.create({
      modelName,
      recordId,
      action: 'delete',
      performedBy: userId,
      changedFields: ['isDeleted', 'deletedAt', 'deletedBy'],
      previousValues: { isDeleted: false },
      newValues: { isDeleted: true, deletedAt: new Date() },
      summary: `Deleted ${modelName} record`
    });
  } catch (err) {
    console.error('Audit log error (delete):', err.message);
  }
}

/**
 * Log a record restoration (un-delete)
 * @param {string} modelName - The model name
 * @param {string} recordId - The record's ID
 * @param {string} userId - The ID of the user who restored the record
 */
async function logRestore(modelName, recordId, userId) {
  try {
    await AuditLog.create({
      modelName,
      recordId,
      action: 'restore',
      performedBy: userId,
      changedFields: ['isDeleted', 'deletedAt', 'deletedBy'],
      previousValues: { isDeleted: true },
      newValues: { isDeleted: false, deletedAt: null, deletedBy: null },
      summary: `Restored ${modelName} record`
    });
  } catch (err) {
    console.error('Audit log error (restore):', err.message);
  }
}

/**
 * Get the audit history for a specific record
 * @param {string} modelName - The model name
 * @param {string} recordId - The record's ID
 * @param {number} limit - Maximum number of entries to return (default 50)
 * @returns {Array} Array of audit log entries
 */
async function getHistory(modelName, recordId, limit = 50) {
  try {
    return await AuditLog.find({ modelName, recordId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('performedBy', 'firstName lastName email')
      .lean();
  } catch (err) {
    console.error('Audit log error (getHistory):', err.message);
    return [];
  }
}

/**
 * Get recent activity across all records (for admin dashboard)
 * @param {number} limit - Maximum number of entries to return
 * @param {string} modelName - Optional filter by model name
 * @returns {Array} Array of audit log entries
 */
async function getRecentActivity(limit = 100, modelName = null) {
  try {
    const query = modelName ? { modelName } : {};
    return await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('performedBy', 'firstName lastName email')
      .lean();
  } catch (err) {
    console.error('Audit log error (getRecentActivity):', err.message);
    return [];
  }
}

/**
 * Get all changes made by a specific user
 * @param {string} userId - The user's ID
 * @param {number} limit - Maximum number of entries to return
 * @returns {Array} Array of audit log entries
 */
async function getUserActivity(userId, limit = 100) {
  try {
    return await AuditLog.find({ performedBy: userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    console.error('Audit log error (getUserActivity):', err.message);
    return [];
  }
}

/**
 * Sanitize values for storage (remove sensitive data, circular refs)
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
function sanitizeValues(obj) {
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip internal fields
    if (key.startsWith('_') || key === '__v') continue;

    // Skip sensitive fields
    if (['password', 'passwordHash', 'resetToken'].includes(key)) continue;

    // Handle dates
    if (value instanceof Date) {
      sanitized[key] = value.toISOString();
    }
    // Handle ObjectIds
    else if (value && value.toString && value._bsontype === 'ObjectId') {
      sanitized[key] = value.toString();
    }
    // Handle nested objects (shallow copy)
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = JSON.parse(JSON.stringify(value));
    }
    // Handle arrays
    else if (Array.isArray(value)) {
      sanitized[key] = value.map(v =>
        v && v._bsontype === 'ObjectId' ? v.toString() : v
      );
    }
    // Handle primitives
    else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

module.exports = {
  logCreate,
  logUpdate,
  logDelete,
  logRestore,
  getHistory,
  getRecentActivity,
  getUserActivity
};
