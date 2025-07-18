const express     = require('express');
const router      = express.Router();
const MetricDef   = require('../models/MetricDefinition');
const MetricValue = require('../models/MetricValue');
const Attendee    = require('../models/Attendee');
const { ensureStaffOrAdmin } = require('./_middleware');

// Form to enter metrics for a program date
router.get('/programs/:programId/metrics/data', ensureStaffOrAdmin, async (req, res) => {
  const metrics   = await MetricDef.find({ program: req.params.programId }).lean();
  const attendees = await Attendee.find({ program: req.params.programId }).lean();
  const date      = req.query.date ? new Date(req.query.date) : new Date();
  // fetch existing values
  const values = await MetricValue.find({
    date, metric: { $in: metrics.map(m=>m._id) }
  }).lean();
  res.render('metricsEntry', { user: req.session.user, metrics, attendees, values, date });
});

// Submit metric values
router.post('/programs/:programId/metrics/data', ensureStaffOrAdmin, async (req, res) => {
  const { date, entries } = req.body;
  const dt = new Date(date);
  // entries expected as { attendeeId: { metricId: value, … }, … }
  for (const [attId, metricMap] of Object.entries(entries)) {
    for (const [metricId, val] of Object.entries(metricMap)) {
      await MetricValue.create({
        attendee: attId,
        metric:   metricId,
        date:     dt,
        value:    val
      });
    }
  }
  req.session.success = 'Metrics saved';
  res.redirect(`/programs/${req.params.programId}/metrics/data?date=${date}`);
});

module.exports = router;
