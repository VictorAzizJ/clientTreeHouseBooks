// jest.setup.js
// Global test setup and teardown

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.MONGO_URI = global.__MONGO_URI__ || 'mongodb://localhost:27017/test';

// Disable Sentry in tests
process.env.SENTRY_ENABLED = 'false';

// Mock Sentry to avoid initialization issues in tests
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  Handlers: {
    requestHandler: jest.fn(() => (req, res, next) => next()),
    tracingHandler: jest.fn(() => (req, res, next) => next()),
    errorHandler: jest.fn(() => (err, req, res, next) => next(err))
  },
  Integrations: {
    Http: jest.fn(),
    Express: jest.fn()
  }
}));

jest.mock('@sentry/profiling-node', () => ({
  ProfilingIntegration: jest.fn()
}));

// Mock console methods to reduce noise in test output (optional)
// Uncomment if you want cleaner test output
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Increase timeout for database operations
jest.setTimeout(60000);

// Set mongoose strictQuery to suppress warning
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
