// config/sidewalkFormulas.js
// ═══════════════════════════════════════════════════════════════════════════════
// Centralized Formula Configuration for Sidewalk Categories
// All four sidewalk types (Carts, Stacks, Readers, Little Tree House) share
// these formulas to ensure consistent tracking and calculations.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sidewalk Categories Configuration
 * Each category uses the same formula structure but can have different display properties
 */
const SIDEWALK_CATEGORIES = {
  carts: {
    id: 'carts',
    name: 'Carts',
    description: 'Mobile book carts for sidewalk distribution',
    icon: 'bi-cart3',
    color: '#6B8E23' // Olive green
  },
  stacks: {
    id: 'stacks',
    name: 'Stacks',
    description: 'Book stacks at fixed sidewalk locations',
    icon: 'bi-stack',
    color: '#8FBC8F' // Sage green
  },
  readers: {
    id: 'readers',
    name: 'Readers',
    description: 'Books distributed to individual readers',
    icon: 'bi-book-half',
    color: '#D2691E' // Terra cotta
  },
  littleTreeHouse: {
    id: 'littleTreeHouse',
    name: 'Little Tree House',
    description: 'Little free library tree house locations',
    icon: 'bi-house-heart',
    color: '#4682B4' // Steel blue
  }
};

/**
 * Shared Formula Definitions
 * These formulas are applied consistently across all sidewalk categories
 */
const FORMULAS = {
  /**
   * Calculate the change between start and end counts
   * Formula: endCount - startCount
   * Positive = books added, Negative = books distributed/taken
   */
  calculateChange: (startCount, endCount) => {
    return endCount - startCount;
  },

  /**
   * Calculate percentage change
   * Formula: ((endCount - startCount) / startCount) * 100
   * Returns null if startCount is 0 to avoid division by zero
   */
  calculatePercentChange: (startCount, endCount) => {
    if (startCount === 0) return null;
    return ((endCount - startCount) / startCount) * 100;
  },

  /**
   * Calculate distribution rate (books taken per day)
   * Formula: -change / days (only if change is negative)
   * Returns 0 if no books were distributed
   */
  calculateDistributionRate: (startCount, endCount, days = 7) => {
    const change = endCount - startCount;
    if (change >= 0) return 0;
    return Math.abs(change) / days;
  },

  /**
   * Calculate restock amount needed to reach target
   * Formula: targetCount - endCount
   * Returns 0 if already at or above target
   */
  calculateRestockNeeded: (endCount, targetCount) => {
    const needed = targetCount - endCount;
    return needed > 0 ? needed : 0;
  },

  /**
   * Determine trend based on change
   * Returns: 'increasing', 'decreasing', or 'stable'
   */
  determineTrend: (startCount, endCount) => {
    const change = endCount - startCount;
    if (change > 0) return 'increasing';
    if (change < 0) return 'decreasing';
    return 'stable';
  }
};

/**
 * Default field values for new inventory records
 */
const DEFAULT_VALUES = {
  startCount: 0,
  endCount: 0,
  targetCount: 50, // Default target inventory level
  notes: ''
};

/**
 * Validation rules for inventory fields
 */
const VALIDATION = {
  startCount: {
    min: 0,
    max: 100000,
    required: true
  },
  endCount: {
    min: 0,
    max: 100000,
    required: true
  },
  targetCount: {
    min: 0,
    max: 100000,
    required: false
  },
  notes: {
    maxLength: 1000,
    required: false
  }
};

/**
 * Apply all formulas to an inventory record
 * Returns an object with all calculated values
 */
function applyFormulas(record) {
  const startCount = record.startCount || 0;
  const endCount = record.endCount || 0;
  const targetCount = record.targetCount || DEFAULT_VALUES.targetCount;

  return {
    change: FORMULAS.calculateChange(startCount, endCount),
    percentChange: FORMULAS.calculatePercentChange(startCount, endCount),
    distributionRate: FORMULAS.calculateDistributionRate(startCount, endCount),
    restockNeeded: FORMULAS.calculateRestockNeeded(endCount, targetCount),
    trend: FORMULAS.determineTrend(startCount, endCount)
  };
}

/**
 * Get category configuration by ID
 */
function getCategory(categoryId) {
  return SIDEWALK_CATEGORIES[categoryId] || null;
}

/**
 * Get all category IDs
 */
function getCategoryIds() {
  return Object.keys(SIDEWALK_CATEGORIES);
}

/**
 * Get all categories as an array
 */
function getAllCategories() {
  return Object.values(SIDEWALK_CATEGORIES);
}

/**
 * Validate a category ID
 */
function isValidCategory(categoryId) {
  return categoryId in SIDEWALK_CATEGORIES;
}

/**
 * Synchronize formula results across all categories for a given week
 * Returns any inconsistencies found
 */
function synchronizeWeekData(weekRecords) {
  const inconsistencies = [];

  weekRecords.forEach(record => {
    const calculated = applyFormulas(record);

    // Check if stored values match calculated values (if any are stored)
    if (record.change !== undefined && record.change !== calculated.change) {
      inconsistencies.push({
        category: record.category,
        field: 'change',
        stored: record.change,
        calculated: calculated.change,
        message: `Change mismatch for ${record.category}: stored ${record.change}, calculated ${calculated.change}`
      });
    }
  });

  return {
    success: inconsistencies.length === 0,
    inconsistencies,
    message: inconsistencies.length === 0
      ? 'All formulas synchronized correctly'
      : `Found ${inconsistencies.length} inconsistency(ies)`
  };
}

module.exports = {
  SIDEWALK_CATEGORIES,
  FORMULAS,
  DEFAULT_VALUES,
  VALIDATION,
  applyFormulas,
  getCategory,
  getCategoryIds,
  getAllCategories,
  isValidCategory,
  synchronizeWeekData
};
