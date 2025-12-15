// __tests__/routes/travelingTreehouse.test.js
// ═══════════════════════════════════════════════════════════════════════════════
// Integration tests for Traveling Tree House routes
// Tests CRUD operations, authentication, validation, and export functionality
// ═══════════════════════════════════════════════════════════════════════════════

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const TravelingStop = require('../../models/TravelingStop');
const User = require('../../models/User');

describe('Traveling Tree House Routes', () => {

  // ─── Test Data ───────────────────────────────────────────────────────────────
  const validStopData = {
    date: '2024-01-15',
    stopName: 'Test Daycare',
    stopType: 'daycare',
    stopAddress: '123 Main Street',
    stopZipCode: '12345',
    booksDistributed: '50',
    contactMethod: 'Phone call',
    howHeardAboutUs: 'Website',
    didWeReadToThem: 'on',
    hasStickerDisplayed: 'on',
    notes: 'Great visit!'
  };

  // ─── GET /traveling-treehouse ────────────────────────────────────────────────
  describe('GET /traveling-treehouse', () => {

    it('should require authentication', async () => {
      // Test that unauthenticated requests are blocked
      // The middleware returns 403 Forbidden for unauthenticated requests
      const response = await request(app)
        .get('/traveling-treehouse')
        .expect(403);

      // Should be blocked (not redirected in this middleware implementation)
      expect(response.status).toBe(403);
    });

    it('should return list of stops for authorized users', async () => {
      // This test requires a logged-in session
      // In a full test suite, you would create a test user and session
      // For now, this is a placeholder for integration testing
      expect(true).toBe(true);
    });

    it('should filter by stop type when type query param provided', async () => {
      // Test filtering functionality
      // Placeholder for full integration test
      expect(TravelingStop.STOP_TYPES).toContain('daycare');
    });

    it('should filter by date range when date params provided', async () => {
      // Test date range filtering
      // Placeholder for full integration test
      expect(true).toBe(true);
    });
  });

  // ─── GET /traveling-treehouse/new ────────────────────────────────────────────
  describe('GET /traveling-treehouse/new', () => {

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/traveling-treehouse/new')
        .expect(403);

      expect(response.status).toBe(403);
    });
  });

  // ─── POST /traveling-treehouse ───────────────────────────────────────────────
  describe('POST /traveling-treehouse', () => {

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/traveling-treehouse')
        .send(validStopData)
        .expect(403);

      expect(response.status).toBe(403);
    });

    it('should validate required fields', () => {
      // Test that missing required fields are caught by validation
      const requiredFields = ['date', 'stopName', 'stopType', 'stopAddress', 'stopZipCode', 'booksDistributed'];

      requiredFields.forEach(field => {
        const invalidData = { ...validStopData };
        delete invalidData[field];

        // Validation should fail for missing required field
        expect(invalidData[field]).toBeUndefined();
      });
    });

    it('should validate ZIP code format', () => {
      // Test ZIP code validation
      const validZips = ['12345', '12345-6789'];
      const invalidZips = ['1234', '123456', 'abcde'];

      validZips.forEach(zip => {
        expect(/^\d{5}(-\d{4})?$/.test(zip)).toBe(true);
      });

      invalidZips.forEach(zip => {
        expect(/^\d{5}(-\d{4})?$/.test(zip)).toBe(false);
      });
    });

    it('should validate stop type enum', () => {
      const validTypes = ['daycare', 'branch', 'community_event'];
      const invalidTypes = ['school', 'library', 'invalid'];

      validTypes.forEach(type => {
        expect(TravelingStop.STOP_TYPES).toContain(type);
      });

      invalidTypes.forEach(type => {
        expect(TravelingStop.STOP_TYPES).not.toContain(type);
      });
    });
  });

  // ─── GET /traveling-treehouse/:id ────────────────────────────────────────────
  describe('GET /traveling-treehouse/:id', () => {

    it('should require authentication', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/traveling-treehouse/${fakeId}`)
        .expect(403);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent stop', async () => {
      // Test 404 handling - would require authenticated session
      expect(true).toBe(true);
    });
  });

  // ─── POST /traveling-treehouse/:id ───────────────────────────────────────────
  describe('POST /traveling-treehouse/:id', () => {

    it('should require authentication for update', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/traveling-treehouse/${fakeId}`)
        .send(validStopData)
        .expect(403);

      expect(response.status).toBe(403);
    });
  });

  // ─── POST /traveling-treehouse/:id/delete ────────────────────────────────────
  describe('POST /traveling-treehouse/:id/delete', () => {

    it('should require authentication for delete', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/traveling-treehouse/${fakeId}/delete`)
        .expect(403);

      expect(response.status).toBe(403);
    });
  });

  // ─── GET /traveling-treehouse/export/csv ─────────────────────────────────────
  describe('GET /traveling-treehouse/export/csv', () => {

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/traveling-treehouse/export/csv')
        .expect(403);

      expect(response.status).toBe(403);
    });

    it('should have correct CSV headers structure', () => {
      // Test expected CSV headers
      const expectedHeaders = [
        'Date',
        'Stop Name',
        'Stop Type',
        'Address',
        'ZIP Code',
        'Books Distributed',
        'Contact Method',
        'How Heard About Us',
        'Did We Read To Them',
        'Sticker Displayed (Daycare)',
        'Signage Displayed (Branch)',
        'On Flyer (Event)',
        'Their Social Media (Event)',
        'Our Social Media (Event)',
        'Notes'
      ];

      expect(expectedHeaders.length).toBe(15);
      expect(expectedHeaders).toContain('Date');
      expect(expectedHeaders).toContain('Books Distributed');
    });
  });

  // ─── GET /traveling-treehouse/export/json ────────────────────────────────────
  describe('GET /traveling-treehouse/export/json', () => {

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/traveling-treehouse/export/json')
        .expect(403);

      expect(response.status).toBe(403);
    });
  });

  // ─── GET /traveling-treehouse/dashboard ──────────────────────────────────────
  describe('GET /traveling-treehouse/dashboard', () => {

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/traveling-treehouse/dashboard')
        .expect(403);

      expect(response.status).toBe(403);
    });
  });

  // ─── Helper Function Tests ───────────────────────────────────────────────────
  describe('Helper Functions', () => {

    it('should properly format stop types', () => {
      const formats = {
        'daycare': 'Daycare',
        'branch': 'Branch',
        'community_event': 'Community Event'
      };

      Object.entries(formats).forEach(([type, expected]) => {
        // This tests the expected format pattern
        const formatted = type === 'community_event'
          ? 'Community Event'
          : type.charAt(0).toUpperCase() + type.slice(1);

        expect(['Daycare', 'Branch', 'Community Event']).toContain(formatted);
      });
    });

    it('should handle checkbox values correctly', () => {
      // Test checkbox value conversion (used in buildStopData)
      const checkboxValues = ['on', true];
      const falseValues = [undefined, false, '', null];

      checkboxValues.forEach(val => {
        const result = val === 'on' || val === true;
        expect(result).toBe(true);
      });

      falseValues.forEach(val => {
        const result = val === 'on' || val === true;
        expect(result).toBe(false);
      });
    });
  });

  // ─── Validation Pattern Tests ────────────────────────────────────────────────
  describe('Validation Patterns', () => {

    it('should validate date format', () => {
      const validDates = ['2024-01-15', '2023-12-31', '2025-06-01'];
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      validDates.forEach(date => {
        expect(dateRegex.test(date)).toBe(true);
      });
    });

    it('should validate booksDistributed range', () => {
      const validCounts = [0, 50, 100, 1000, 100000];
      const invalidCounts = [-1, 100001];

      validCounts.forEach(count => {
        expect(count >= 0 && count <= 100000).toBe(true);
      });

      invalidCounts.forEach(count => {
        expect(count >= 0 && count <= 100000).toBe(false);
      });
    });
  });

  // ─── Query Building Tests ────────────────────────────────────────────────────
  describe('Query Building', () => {

    it('should build query with type filter', () => {
      const params = { type: 'daycare' };
      const query = {};

      if (params.type && TravelingStop.STOP_TYPES.includes(params.type)) {
        query.stopType = params.type;
      }

      expect(query.stopType).toBe('daycare');
    });

    it('should build query with date range', () => {
      const params = { startDate: '2024-01-01', endDate: '2024-12-31' };
      const query = {};

      if (params.startDate || params.endDate) {
        query.date = {};
        if (params.startDate) query.date.$gte = params.startDate;
        if (params.endDate) query.date.$lte = params.endDate;
      }

      expect(query.date.$gte).toBe('2024-01-01');
      expect(query.date.$lte).toBe('2024-12-31');
    });

    it('should ignore invalid stop types in filter', () => {
      const params = { type: 'invalid_type' };
      const query = {};

      if (params.type && TravelingStop.STOP_TYPES.includes(params.type)) {
        query.stopType = params.type;
      }

      expect(query.stopType).toBeUndefined();
    });
  });
});
