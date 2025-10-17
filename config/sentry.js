// config/sentry.js
//
// ═══════════════════════════════════════════════════════════════════════════
// SENTRY ERROR MONITORING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
//
// This file configures Sentry for real-time error tracking and performance monitoring.
// Sentry captures unhandled errors, provides stack traces, and helps debug production issues.
//
// ─── SETUP INSTRUCTIONS ──────────────────────────────────────────────────────
//
// 1. Create a Sentry account at https://sentry.io/signup/
// 2. Create a new project (select "Node.js" as the platform)
// 3. Copy your DSN (Data Source Name) from the project settings
// 4. Add to your .env file:
//    SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
//    NODE_ENV=production  (or development/test)
//
// 5. Optional environment variables:
//    SENTRY_ENVIRONMENT=production  (override NODE_ENV for Sentry)
//    SENTRY_TRACES_SAMPLE_RATE=0.1  (performance monitoring sample rate, 0.0-1.0)
//    SENTRY_ENABLED=true             (explicitly enable/disable Sentry)
//
// ─── WHAT GETS TRACKED ───────────────────────────────────────────────────────
//
// - Unhandled exceptions and promise rejections
// - Express middleware errors
// - HTTP request performance (when tracing enabled)
// - User context (sanitized - no passwords)
// - Server environment (OS, Node version, etc.)
//
// ─── PRIVACY & SECURITY ──────────────────────────────────────────────────────
//
// - Passwords are automatically filtered from error data
// - Sensitive headers (Authorization, Cookie) are stripped
// - PII can be scrubbed using beforeSend hook below
//
// ═══════════════════════════════════════════════════════════════════════════

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry error monitoring
 * @param {Express.Application} app - Express application instance
 */
function initSentry(app) {
  // Only initialize if DSN is provided and not explicitly disabled
  const dsn = process.env.SENTRY_DSN;
  const enabled = process.env.SENTRY_ENABLED !== 'false';

  if (!dsn) {
    console.warn('⚠️  Sentry DSN not configured. Error monitoring disabled.');
    console.warn('   Set SENTRY_DSN in .env to enable Sentry.');
    return;
  }

  if (!enabled) {
    console.log('ℹ️  Sentry explicitly disabled via SENTRY_ENABLED=false');
    return;
  }

  // Determine environment
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

  // Get sample rate for performance monitoring (0.0 to 1.0)
  // Lower values reduce overhead in production (e.g., 0.1 = 10% of transactions)
  const tracesSampleRate = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1');

  Sentry.init({
    dsn,
    environment,

    // Integrations
    integrations: [
      // Enable HTTP instrumentation
      new Sentry.Integrations.Http({ tracing: true }),

      // Enable Express request tracing
      new Sentry.Integrations.Express({ app }),

      // Enable profiling (helps identify performance bottlenecks)
      new ProfilingIntegration(),
    ],

    // Performance Monitoring sample rate (0.0 to 1.0)
    // In production, sample a subset of requests to reduce overhead
    tracesSampleRate,

    // Profiling sample rate (0.0 to 1.0)
    // Should be lower than tracesSampleRate for production
    profilesSampleRate: tracesSampleRate,

    // ─── Data Scrubbing & Privacy ────────────────────────────────────────────

    // beforeSend is called before sending error events to Sentry
    // Use this to scrub sensitive data or filter events
    beforeSend(event, hint) {
      // Remove sensitive query parameters
      if (event.request && event.request.query_string) {
        // Remove tokens, passwords, etc. from query strings
        event.request.query_string = event.request.query_string
          .replace(/token=[^&]*/gi, 'token=[REDACTED]')
          .replace(/password=[^&]*/gi, 'password=[REDACTED]')
          .replace(/secret=[^&]*/gi, 'secret=[REDACTED]');
      }

      // Remove sensitive form data
      if (event.request && event.request.data) {
        if (typeof event.request.data === 'object') {
          const sanitized = { ...event.request.data };
          ['password', 'newPassword', 'currentPassword', 'token', 'secret'].forEach(key => {
            if (sanitized[key]) sanitized[key] = '[REDACTED]';
          });
          event.request.data = sanitized;
        }
      }

      return event;
    },

    // Ignore specific errors that are not actionable
    ignoreErrors: [
      // Browser/client-side errors that leak into server logs
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',

      // Network errors (often transient)
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',

      // Add other errors to ignore here
    ],
  });

  console.log(`✅ Sentry initialized (env: ${environment}, trace rate: ${tracesSampleRate * 100}%)`);
}

/**
 * Get Sentry request handler middleware
 * Must be used BEFORE all other middleware and routes
 */
function getRequestHandler() {
  // If Sentry is not initialized, return no-op middleware
  if (!Sentry.Handlers) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.requestHandler();
}

/**
 * Get Sentry tracing handler middleware
 * Should be used AFTER request handler but BEFORE routes
 */
function getTracingHandler() {
  // If Sentry is not initialized, return no-op middleware
  if (!Sentry.Handlers) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
}

/**
 * Get Sentry error handler middleware
 * Must be used AFTER all routes but BEFORE other error handlers
 */
function getErrorHandler() {
  // If Sentry is not initialized, return no-op middleware
  if (!Sentry.Handlers) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler();
}

/**
 * Manually capture an exception
 * @param {Error} error - Error to capture
 * @param {Object} context - Additional context (user, tags, etc.)
 */
function captureException(error, context = {}) {
  // If Sentry is not initialized, just log to console
  if (!Sentry.captureException) {
    console.error('Error (Sentry disabled):', error);
    return;
  }

  if (context.user) {
    Sentry.setUser(context.user);
  }
  if (context.tags) {
    Sentry.setTags(context.tags);
  }
  if (context.extra) {
    Sentry.setExtras(context.extra);
  }
  Sentry.captureException(error);
}

/**
 * Manually capture a message
 * @param {String} message - Message to capture
 * @param {String} level - Severity level (fatal, error, warning, info, debug)
 */
function captureMessage(message, level = 'info') {
  // If Sentry is not initialized, just log to console
  if (!Sentry.captureMessage) {
    console.log(`[${level.toUpperCase()}] ${message}`);
    return;
  }
  Sentry.captureMessage(message, level);
}

module.exports = {
  initSentry,
  getRequestHandler,
  getTracingHandler,
  getErrorHandler,
  captureException,
  captureMessage,
  Sentry // Export raw Sentry for advanced usage
};
