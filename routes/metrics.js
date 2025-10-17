// src/routes/metrics.js
const express          = require('express');
const router           = express.Router();
const MetricDef        = require('../models/MetricDefinition');
const MetricValue      = require('../models/MetricValue');
const Program          = require('../models/Program');
const { ensureStaffOrAdmin } = require('./_middleware');

/**
 * Helper to cast a string input into the correct JS type
 * based on the metric definition's `type`.
 */
function castValue(raw, type) {
  switch (type) {
    case 'number':
      return parseFloat(raw);
    case 'boolean':
      return raw === 'true' || raw === true;
    case 'date':
      return raw;            // YYYY-MM-DD string
    case 'text':
    default:
      return raw;
  }
}

/**
 * GET /metrics/overview
 * Metrics dashboard for staff and admin - view aggregated metrics across all programs
 */
router.get('/metrics/overview', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const user = req.session.user;

    // Get all programs with their metrics
    const programs = await Program.find().lean();

    // For each program, get metric definitions and recent values
    const metricsData = await Promise.all(programs.map(async (program) => {
      const definitions = await MetricDef.find({ program: program._id }).lean();

      // For each definition, calculate aggregate stats
      const stats = await Promise.all(definitions.map(async (def) => {
        const values = await MetricValue
          .find({ definition: def._id })
          .sort({ date: -1 })
          .limit(100) // Last 100 records
          .populate('member', 'firstName lastName')
          .lean();

        let aggregate = null;

        // Calculate aggregates based on type
        if (def.type === 'number' && values.length > 0) {
          const numbers = values.map(v => v.value).filter(v => typeof v === 'number');
          if (numbers.length > 0) {
            aggregate = {
              avg: (numbers.reduce((a, b) => a + b, 0) / numbers.length).toFixed(2),
              min: Math.min(...numbers),
              max: Math.max(...numbers),
              count: numbers.length
            };
          }
        } else if (def.type === 'boolean' && values.length > 0) {
          const trueCount = values.filter(v => v.value === true).length;
          aggregate = {
            trueCount,
            falseCount: values.length - trueCount,
            truePercentage: ((trueCount / values.length) * 100).toFixed(1),
            count: values.length
          };
        }

        return {
          definition: def,
          recentValues: values.slice(0, 10), // Most recent 10
          aggregate
        };
      }));

      return {
        program,
        metrics: stats
      };
    }));

    res.render('metricsOverview', {
      user,
      metricsData
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /programs/:programId/metrics/data
 * Records metric values for a given program, date, and member.
 * Body payload:
 *   - date:      "YYYY-MM-DD"
 *   - memberId:  the ObjectId of the Member
 *   - values:    { [metricDefId]: rawValue, ... }
 */
router.post(
  '/programs/:programId/metrics/data',
  ensureStaffOrAdmin,
  async (req, res, next) => {
    try {
      const { programId } = req.params;
      const { date, memberId, values = {} } = req.body;

      // 1) Load all definitions for this program to know each type
      const definitions = await MetricDef.find({ program: programId }).lean();
      const defMap = definitions.reduce((map, def) => {
        map[def._id] = def;
        return map;
      }, {});

      // 2) Upsert each provided value
      for (const [defId, rawValue] of Object.entries(values)) {
        // Skip empty inputs
        if (rawValue === '' || rawValue == null) continue;
        const def = defMap[defId];
        if (!def) continue; // unknown definition

        const casted = castValue(rawValue, def.type);

        await MetricValue.findOneAndUpdate(
          {
            program:    programId,
            definition: defId,
            member:     memberId,
            date
          },
          {
            program:    programId,
            definition: defId,
            member:     memberId,
            date,
            value:      casted
          },
          { upsert: true, new: true }
        );
      }

      req.session.success = 'Metrics recorded';
      res.redirect(`/programs/${programId}`);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

