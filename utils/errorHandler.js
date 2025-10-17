// utils/errorHandler.js
//
// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════
//
// Centralized error handling utilities that integrate with Sentry.
// Use these throughout the application for consistent error tracking.
//
// ─── USAGE EXAMPLES ──────────────────────────────────────────────────────────
//
// In route handlers:
//   const { asyncHandler, captureError } = require('../utils/errorHandler');
//
//   router.get('/members', asyncHandler(async (req, res) => {
//     const members = await Member.find();
//     res.render('membersList', { members });
//   }));
//
// In services or business logic:
//   try {
//     await sendEmail(user.email, 'Welcome!');
//   } catch (err) {
//     captureError(err, {
//       context: 'Email sending failed',
//       user: { id: user._id, email: user.email },
//       severity: 'warning'
//     });
//   }
//
// ═══════════════════════════════════════════════════════════════════════════

const { captureException, captureMessage } = require('../config/sentry');

/**
 * Async handler wrapper to catch promise rejections in Express routes
 * Eliminates need for try/catch blocks in every async route handler
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function that catches errors
 *
 * @example
 * router.get('/members', asyncHandler(async (req, res) => {
 *   const members = await Member.find();
 *   res.json(members);
 * }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Capture and log an error with optional context
 * Sends error to Sentry and logs to console/file
 *
 * @param {Error} error - The error object to capture
 * @param {Object} options - Additional context
 * @param {String} options.context - Human-readable context description
 * @param {Object} options.user - User information { id, email, role }
 * @param {Object} options.tags - Tags for filtering in Sentry
 * @param {Object} options.extra - Extra metadata
 * @param {String} options.severity - Error severity (fatal|error|warning|info|debug)
 *
 * @example
 * captureError(err, {
 *   context: 'Failed to process checkout',
 *   user: { id: req.user._id, email: req.user.email },
 *   tags: { operation: 'checkout' },
 *   extra: { memberId: member._id, numberOfBooks: 5 },
 *   severity: 'error'
 * });
 */
function captureError(error, options = {}) {
  const { context, user, tags, extra, severity = 'error' } = options;

  // Log to console/file
  console.error(`[${severity.toUpperCase()}] ${context || 'Error occurred'}:`, error);

  // Send to Sentry with context
  captureException(error, {
    user: user ? {
      id: user.id?.toString(),
      email: user.email,
      role: user.role
    } : undefined,
    tags: {
      ...tags,
      severity,
      ...(context ? { context } : {})
    },
    extra
  });
}

/**
 * Log a message to Sentry (non-error events)
 * Use for important events that aren't errors but need tracking
 *
 * @param {String} message - Message to log
 * @param {Object} options - Additional context
 * @param {String} options.level - Message level (fatal|error|warning|info|debug)
 * @param {Object} options.tags - Tags for filtering
 * @param {Object} options.extra - Extra metadata
 *
 * @example
 * logMessage('Large checkout detected', {
 *   level: 'warning',
 *   tags: { operation: 'checkout' },
 *   extra: { numberOfBooks: 50, memberId: member._id }
 * });
 */
function logMessage(message, options = {}) {
  const { level = 'info', tags, extra } = options;

  console.log(`[${level.toUpperCase()}] ${message}`);

  captureMessage(message, {
    level,
    tags,
    extra
  });
}

/**
 * Create a standardized error response object
 * Use this for consistent API error responses
 *
 * @param {String} message - User-friendly error message
 * @param {Number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Object} Error response object
 *
 * @example
 * const error = createErrorResponse('Member not found', 404, { memberId });
 * res.status(error.statusCode).json(error);
 */
function createErrorResponse(message, statusCode = 500, details = {}) {
  return {
    error: true,
    message,
    statusCode,
    ...details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Validation error handler
 * Use with express-validator to format validation errors
 *
 * @param {Array} errors - Array of validation errors from express-validator
 * @returns {Object} Formatted error response
 *
 * @example
 * const errors = validationResult(req);
 * if (!errors.isEmpty()) {
 *   return res.status(400).json(handleValidationErrors(errors.array()));
 * }
 */
function handleValidationErrors(errors) {
  const formattedErrors = errors.map(err => ({
    field: err.param || err.path,
    message: err.msg,
    value: err.value
  }));

  return createErrorResponse('Validation failed', 400, {
    validationErrors: formattedErrors
  });
}

/**
 * Database error handler
 * Converts MongoDB errors to user-friendly messages
 *
 * @param {Error} error - MongoDB error
 * @returns {Object} Formatted error response
 *
 * @example
 * try {
 *   await member.save();
 * } catch (err) {
 *   return res.status(400).json(handleDatabaseError(err));
 * }
 */
function handleDatabaseError(error) {
  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    return createErrorResponse(
      `A record with this ${field} already exists`,
      409,
      { field, type: 'duplicate' }
    );
  }

  // Validation error
  if (error.name === 'ValidationError') {
    const validationErrors = Object.keys(error.errors).map(field => ({
      field,
      message: error.errors[field].message
    }));
    return createErrorResponse('Validation failed', 400, { validationErrors });
  }

  // Cast error (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    return createErrorResponse(
      `Invalid ${error.path}: ${error.value}`,
      400,
      { field: error.path, type: 'cast' }
    );
  }

  // Generic database error
  return createErrorResponse('Database operation failed', 500);
}

module.exports = {
  asyncHandler,
  captureError,
  logMessage,
  createErrorResponse,
  handleValidationErrors,
  handleDatabaseError
};
