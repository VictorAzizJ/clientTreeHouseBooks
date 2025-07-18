// src/routes/metrics.js
const express          = require('express');
const router           = express.Router();
const MetricDef        = require('../models/MetricDefinition');
const MetricValue      = require('../models/MetricValue');
const { ensureStaffOrAdmin } = require('./_middleware');

/**
 * Helper to cast a string input into the correct JS type
 * based on the metric definition’s `type`.
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

