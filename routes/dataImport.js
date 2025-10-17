// routes/dataImport.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { ensureStaffOrAdmin } = require('./_middleware');
const {
  CSV_TEMPLATES,
  previewImport,
  executeImport,
  rollbackImport
} = require('../services/dataImport');
const ImportHistory = require('../models/ImportHistory');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * GET /import
 * Data import dashboard
 */
router.get('/import', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const user = req.session.user;

    // Get recent imports
    const recentImports = await ImportHistory.find()
      .sort({ startedAt: -1 })
      .limit(10)
      .populate('importedBy', 'firstName lastName')
      .lean();

    res.render('dataImport', {
      user,
      recentImports,
      importTypes: Object.keys(CSV_TEMPLATES),
      success: req.session.success,
      error: req.session.error
    });

    delete req.session.success;
    delete req.session.error;
  } catch (err) {
    next(err);
  }
});

/**
 * GET /import/template/:type
 * Download CSV template for import type
 */
router.get('/import/template/:type', ensureStaffOrAdmin, (req, res, next) => {
  try {
    const importType = req.params.type;
    const template = CSV_TEMPLATES[importType];

    if (!template) {
      return res.status(404).send('Template not found');
    }

    // Generate CSV header and example row
    const allColumns = [...template.required, ...template.optional];
    const header = allColumns.join(',');
    const exampleRow = allColumns.map(col => template.example[col] || '').join(',');

    const csv = `${header}\n${exampleRow}`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${importType}_template.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /import/preview
 * Preview CSV import without saving
 */
router.post('/import/preview',
  ensureStaffOrAdmin,
  upload.single('csvFile'),
  async (req, res, next) => {
    try {
      const { importType } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const preview = previewImport(csvContent, importType);

      res.json({
        ...preview,
        fileName: req.file.originalname
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

/**
 * POST /import/execute
 * Execute CSV import
 */
router.post('/import/execute',
  ensureStaffOrAdmin,
  upload.single('csvFile'),
  async (req, res, next) => {
    try {
      const user = req.session.user;
      const { importType } = req.body;

      if (!req.file) {
        req.session.error = 'No file uploaded';
        return res.redirect('/import');
      }

      const csvContent = req.file.buffer.toString('utf-8');

      // Execute import
      const importHistory = await executeImport(
        csvContent,
        importType,
        user._id,
        req.file.originalname
      );

      req.session.success = `Import completed! ${importHistory.stats.successful} records imported successfully. ${importHistory.stats.failed} failed.`;
      res.redirect(`/import/history/${importHistory._id}`);
    } catch (err) {
      req.session.error = `Import failed: ${err.message}`;
      res.redirect('/import');
    }
  }
);

/**
 * GET /import/history/:id
 * View import history details
 */
router.get('/import/history/:id', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const user = req.session.user;
    const importHistory = await ImportHistory.findById(req.params.id)
      .populate('importedBy', 'firstName lastName')
      .lean();

    if (!importHistory) {
      return res.status(404).send('Import history not found');
    }

    res.render('importHistory', {
      user,
      importHistory,
      success: req.session.success
    });

    delete req.session.success;
  } catch (err) {
    next(err);
  }
});

/**
 * POST /import/rollback/:id
 * Rollback an import
 */
router.post('/import/rollback/:id', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const results = await rollbackImport(req.params.id);

    req.session.success = `Rollback completed! ${results.deleted} records deleted. ${results.errors.length} errors.`;
    res.redirect(`/import/history/${req.params.id}`);
  } catch (err) {
    req.session.error = `Rollback failed: ${err.message}`;
    res.redirect(`/import/history/${req.params.id}`);
  }
});

/**
 * GET /import/history
 * View all import history
 */
router.get('/import/history', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const user = req.session.user;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const totalImports = await ImportHistory.countDocuments();
    const imports = await ImportHistory.find()
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('importedBy', 'firstName lastName')
      .lean();

    const totalPages = Math.ceil(totalImports / limit);

    res.render('importHistoryList', {
      user,
      imports,
      pagination: {
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
