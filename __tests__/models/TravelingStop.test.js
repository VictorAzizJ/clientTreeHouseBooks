// __tests__/models/TravelingStop.test.js
// ═══════════════════════════════════════════════════════════════════════════════
// Unit tests for the TravelingStop model
// Tests schema validation, conditional settings, indexes, and static methods
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const TravelingStop = require('../../models/TravelingStop');

describe('TravelingStop Model', () => {

  // ─── Schema Validation Tests ─────────────────────────────────────────────────
  describe('Schema Validation', () => {

    it('should require date field', async () => {
      const stop = new TravelingStop({
        stopName: 'Test Daycare',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50
      });

      const error = stop.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.date).toBeDefined();
    });

    it('should require stopName field', async () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50
      });

      const error = stop.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.stopName).toBeDefined();
    });

    it('should require stopType to be valid enum value', async () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Test Location',
        stopType: 'invalid_type',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50
      });

      const error = stop.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.stopType).toBeDefined();
    });

    it('should accept valid stop types', () => {
      const validTypes = ['daycare', 'branch', 'community_event'];

      validTypes.forEach(type => {
        const stop = new TravelingStop({
          date: '2024-01-15',
          stopName: 'Test Location',
          stopType: type,
          stopAddress: '123 Main St',
          stopZipCode: '12345',
          booksDistributed: 50
        });

        const error = stop.validateSync();
        // Should not have stopType error
        expect(error?.errors?.stopType).toBeUndefined();
      });
    });

    it('should validate ZIP code format (5 digits)', () => {
      const validStop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Test Location',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50
      });

      const error = validStop.validateSync();
      expect(error?.errors?.stopZipCode).toBeUndefined();
    });

    it('should validate ZIP code format (ZIP+4)', () => {
      const validStop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Test Location',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345-6789',
        booksDistributed: 50
      });

      const error = validStop.validateSync();
      expect(error?.errors?.stopZipCode).toBeUndefined();
    });

    it('should reject invalid ZIP code formats', () => {
      const invalidZips = ['1234', '123456', 'abcde', '12345-678', '12345-67890'];

      invalidZips.forEach(zip => {
        const stop = new TravelingStop({
          date: '2024-01-15',
          stopName: 'Test Location',
          stopType: 'daycare',
          stopAddress: '123 Main St',
          stopZipCode: zip,
          booksDistributed: 50
        });

        const error = stop.validateSync();
        expect(error?.errors?.stopZipCode).toBeDefined();
      });
    });

    it('should require booksDistributed to be non-negative', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Test Location',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: -5
      });

      const error = stop.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.booksDistributed).toBeDefined();
    });

    it('should enforce maximum length on stopName', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'A'.repeat(201), // Exceeds 200 char limit
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50
      });

      const error = stop.validateSync();
      expect(error?.errors?.stopName).toBeDefined();
    });
  });

  // ─── Conditional Settings Tests ──────────────────────────────────────────────
  describe('Conditional Settings', () => {

    it('should store daycareSettings for daycare stops', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Sunshine Daycare',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50,
        daycareSettings: {
          hasStickerDisplayed: true
        }
      });

      expect(stop.daycareSettings.hasStickerDisplayed).toBe(true);
    });

    it('should default daycareSettings.hasStickerDisplayed to false', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Test Daycare',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50
      });

      expect(stop.daycareSettings.hasStickerDisplayed).toBe(false);
    });

    it('should store branchSettings for branch stops', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Downtown Branch',
        stopType: 'branch',
        stopAddress: '456 Oak Ave',
        stopZipCode: '12345',
        booksDistributed: 75,
        branchSettings: {
          hasSignageDisplayed: true
        }
      });

      expect(stop.branchSettings.hasSignageDisplayed).toBe(true);
    });

    it('should store communityEventSettings for community_event stops', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Summer Festival',
        stopType: 'community_event',
        stopAddress: '789 Park Blvd',
        stopZipCode: '12345',
        booksDistributed: 200,
        communityEventSettings: {
          wereWeOnFlyer: true,
          featuredOnTheirSocialMedia: true,
          didWeShareOnOurSocialMedia: false
        }
      });

      expect(stop.communityEventSettings.wereWeOnFlyer).toBe(true);
      expect(stop.communityEventSettings.featuredOnTheirSocialMedia).toBe(true);
      expect(stop.communityEventSettings.didWeShareOnOurSocialMedia).toBe(false);
    });

    it('should store didWeReadToThem for all stop types', () => {
      const types = ['daycare', 'branch', 'community_event'];

      types.forEach(type => {
        const stop = new TravelingStop({
          date: '2024-01-15',
          stopName: 'Test Location',
          stopType: type,
          stopAddress: '123 Main St',
          stopZipCode: '12345',
          booksDistributed: 50,
          didWeReadToThem: true
        });

        expect(stop.didWeReadToThem).toBe(true);
      });
    });
  });

  // ─── Timestamps Tests ────────────────────────────────────────────────────────
  describe('Timestamps', () => {

    it('should auto-set createdAt on creation', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Test Location',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50
      });

      expect(stop.createdAt).toBeDefined();
      expect(stop.createdAt).toBeInstanceOf(Date);
    });

    it('should auto-set updatedAt on creation', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Test Location',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50
      });

      expect(stop.updatedAt).toBeDefined();
      expect(stop.updatedAt).toBeInstanceOf(Date);
    });
  });

  // ─── Static Properties Tests ─────────────────────────────────────────────────
  describe('Static Properties', () => {

    it('should expose STOP_TYPES array', () => {
      expect(TravelingStop.STOP_TYPES).toBeDefined();
      expect(Array.isArray(TravelingStop.STOP_TYPES)).toBe(true);
    });

    it('should include all expected stop types', () => {
      expect(TravelingStop.STOP_TYPES).toContain('daycare');
      expect(TravelingStop.STOP_TYPES).toContain('branch');
      expect(TravelingStop.STOP_TYPES).toContain('community_event');
    });

    it('should have exactly 3 stop types', () => {
      expect(TravelingStop.STOP_TYPES.length).toBe(3);
    });
  });

  // ─── Optional Fields Tests ───────────────────────────────────────────────────
  describe('Optional Fields', () => {

    it('should allow contactMethod to be empty', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Test Location',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50
      });

      const error = stop.validateSync();
      expect(error?.errors?.contactMethod).toBeUndefined();
    });

    it('should allow howHeardAboutUs to be empty', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Test Location',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50
      });

      const error = stop.validateSync();
      expect(error?.errors?.howHeardAboutUs).toBeUndefined();
    });

    it('should allow notes to be empty', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Test Location',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50
      });

      const error = stop.validateSync();
      expect(error?.errors?.notes).toBeUndefined();
    });

    it('should enforce maximum length on notes', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Test Location',
        stopType: 'daycare',
        stopAddress: '123 Main St',
        stopZipCode: '12345',
        booksDistributed: 50,
        notes: 'A'.repeat(2001) // Exceeds 2000 char limit
      });

      const error = stop.validateSync();
      expect(error?.errors?.notes).toBeDefined();
    });
  });

  // ─── Full Document Creation Test ─────────────────────────────────────────────
  describe('Full Document Creation', () => {

    it('should create a valid complete document', () => {
      const stop = new TravelingStop({
        date: '2024-01-15',
        stopName: 'Sunshine Daycare Center',
        stopType: 'daycare',
        stopAddress: '123 Main Street, Suite 100',
        stopZipCode: '19123',
        booksDistributed: 75,
        contactMethod: 'Phone call',
        howHeardAboutUs: 'Word of mouth',
        didWeReadToThem: true,
        daycareSettings: {
          hasStickerDisplayed: true
        },
        notes: 'Great visit! Kids were very engaged.'
      });

      const error = stop.validateSync();
      expect(error).toBeUndefined();

      // Verify all fields are set correctly
      expect(stop.date).toBe('2024-01-15');
      expect(stop.stopName).toBe('Sunshine Daycare Center');
      expect(stop.stopType).toBe('daycare');
      expect(stop.stopAddress).toBe('123 Main Street, Suite 100');
      expect(stop.stopZipCode).toBe('19123');
      expect(stop.booksDistributed).toBe(75);
      expect(stop.contactMethod).toBe('Phone call');
      expect(stop.howHeardAboutUs).toBe('Word of mouth');
      expect(stop.didWeReadToThem).toBe(true);
      expect(stop.daycareSettings.hasStickerDisplayed).toBe(true);
      expect(stop.notes).toBe('Great visit! Kids were very engaged.');
    });
  });
});
