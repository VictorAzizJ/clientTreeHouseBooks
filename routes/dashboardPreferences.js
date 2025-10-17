// routes/dashboardPreferences.js
const express = require('express');
const router = express.Router();
const DashboardPreference = require('../models/DashboardPreference');

/**
 * Middleware: Ensure user is authenticated
 */
function ensureAuthenticated(req, res, next) {
  if (req.session?.user) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

/**
 * GET /api/dashboard/preferences
 * Get user's dashboard preferences
 */
router.get('/api/dashboard/preferences', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.session.user._id;

    let prefs = await DashboardPreference.findOne({ user: userId }).lean();

    // If no preferences exist, create defaults
    if (!prefs) {
      prefs = await DashboardPreference.create({ user: userId });
    }

    res.json(prefs);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dashboard/preferences/widget-visibility
 * Toggle visibility of a specific widget
 * Body: { widgetId: string, visible: boolean }
 */
router.post('/api/dashboard/preferences/widget-visibility', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { widgetId, visible } = req.body;

    if (!widgetId || typeof visible !== 'boolean') {
      return res.status(400).json({ error: 'Invalid request' });
    }

    let prefs = await DashboardPreference.findOne({ user: userId });

    if (!prefs) {
      prefs = await DashboardPreference.create({ user: userId });
    }

    prefs.widgetVisibility.set(widgetId, visible);
    await prefs.save();

    res.json({ success: true, prefs });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dashboard/preferences/widget-order
 * Update widget order/layout
 * Body: { widgetOrder: string[] }
 */
router.post('/api/dashboard/preferences/widget-order', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { widgetOrder } = req.body;

    if (!Array.isArray(widgetOrder)) {
      return res.status(400).json({ error: 'widgetOrder must be an array' });
    }

    let prefs = await DashboardPreference.findOne({ user: userId });

    if (!prefs) {
      prefs = await DashboardPreference.create({ user: userId });
    }

    prefs.widgetOrder = widgetOrder;
    await prefs.save();

    res.json({ success: true, prefs });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dashboard/preferences/chart-type
 * Update chart type preference
 * Body: { chartId: string, chartType: string }
 */
router.post('/api/dashboard/preferences/chart-type', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { chartId, chartType } = req.body;

    const validCharts = {
      checkoutsChart: ['line', 'bar'],
      donationsChart: ['line', 'bar'],
      membersChart: ['line', 'bar'],
      programsChart: ['bar', 'pie', 'doughnut']
    };

    if (!validCharts[chartId] || !validCharts[chartId].includes(chartType)) {
      return res.status(400).json({ error: 'Invalid chart type' });
    }

    let prefs = await DashboardPreference.findOne({ user: userId });

    if (!prefs) {
      prefs = await DashboardPreference.create({ user: userId });
    }

    prefs.chartPreferences[`${chartId}Type`] = chartType;
    await prefs.save();

    res.json({ success: true, prefs });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dashboard/preferences/reset
 * Reset all preferences to defaults
 */
router.post('/api/dashboard/preferences/reset', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.session.user._id;

    await DashboardPreference.findOneAndDelete({ user: userId });
    const prefs = await DashboardPreference.create({ user: userId });

    res.json({ success: true, prefs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
