// routes/classroom.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Program = require('../models/Program');
const Attendee = require('../models/Attendee');
const Member = require('../models/Member');
const MetricValue = require('../models/MetricValue');
const MetricDef = require('../models/MetricDefinition');
const Attendance = require('../models/Attendance');
const { ensureStaffOrAdmin } = require('./_middleware');
const {
  initializeClassroomMetrics,
  addStudentToClassroom,
  getClassroomSummary,
  bulkSyncAttendeesToMembers
} = require('../services/classroomTemplates');

/**
 * GET /classroom/setup
 * Classroom program setup wizard
 */
router.get('/classroom/setup', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const user = req.session.user;
    res.render('classroomSetup', { user });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /classroom/create
 * Create new classroom program with template
 */
router.post('/classroom/create',
  ensureStaffOrAdmin,
  [
    body('name').trim().notEmpty().withMessage('Program name is required'),
    body('description').optional().trim(),
    body('gradeLevels').optional(),
    body('days').optional(),
    body('startTime').optional().trim(),
    body('endTime').optional().trim()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, gradeLevels, days, startTime, endTime } = req.body;

      // Create classroom program
      const program = await Program.create({
        name,
        description,
        templateType: 'classroom',
        classroomSettings: {
          autoSyncAttendees: true,
          requireParent: true,
          trackAttendance: true,
          trackBehavior: true,
          trackGrades: true,
          gradeLevels: gradeLevels ? (Array.isArray(gradeLevels) ? gradeLevels : [gradeLevels]) : [],
          schedule: {
            days: days ? (Array.isArray(days) ? days : [days]) : [],
            startTime,
            endTime
          }
        }
      });

      // Initialize classroom metrics
      await initializeClassroomMetrics(program._id);

      req.session.success = `Classroom program "${name}" created successfully!`;
      res.redirect(`/classroom/${program._id}/manage`);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /classroom/:id/manage
 * Classroom management dashboard
 */
router.get('/classroom/:id/manage', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const user = req.session.user;
    const programId = req.params.id;

    const program = await Program.findById(programId).lean();
    if (!program) {
      return res.status(404).send('Program not found');
    }

    const summary = await getClassroomSummary(programId);
    const metrics = await MetricDef.find({ program: programId }).lean();

    // Get all parent members for dropdown
    const parents = await Member.find({ memberType: 'adult' })
      .sort('lastName firstName')
      .lean();

    res.render('classroomManage', {
      user,
      program,
      summary,
      metrics,
      parents,
      success: req.session.success
    });

    delete req.session.success;
  } catch (err) {
    next(err);
  }
});

/**
 * POST /classroom/:id/add-student
 * Add student to classroom program
 */
router.post('/classroom/:id/add-student',
  ensureStaffOrAdmin,
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('grade').optional().trim(),
    body('dateOfBirth').optional().isISO8601(),
    body('school').optional().trim(),
    body('parentId').optional().isMongoId()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const programId = req.params.id;
      const { firstName, lastName, grade, dateOfBirth, school, email, phone, parentId } = req.body;

      // Get parent if provided
      let parent = null;
      if (parentId) {
        parent = await Member.findById(parentId);
      }

      const studentInfo = {
        firstName,
        lastName,
        grade,
        dateOfBirth,
        school,
        email,
        phone
      };

      const result = await addStudentToClassroom(
        programId,
        studentInfo,
        parent ? { ...parent.toObject() } : null
      );

      req.session.success = `Student ${firstName} ${lastName} added successfully!`;
      res.redirect(`/classroom/${programId}/manage`);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /classroom/:id/tracker
 * Daily attendance and metric tracking interface
 */
router.get('/classroom/:id/tracker', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const user = req.session.user;
    const programId = req.params.id;
    const date = req.query.date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const program = await Program.findById(programId).lean();
    if (!program) {
      return res.status(404).send('Program not found');
    }

    const attendees = await Attendee.find({ program: programId })
      .populate('member')
      .populate('parentMember')
      .sort('lastName firstName')
      .lean();

    const metrics = await MetricDef.find({ program: programId }).lean();

    // Get existing attendance for this date
    const attendanceRecords = await Attendance.find({ program: programId, date }).lean();
    const attendanceMap = {};
    attendanceRecords.forEach(r => {
      attendanceMap[r.member.toString()] = true;
    });

    // Get existing metric values for this date
    const metricValues = await MetricValue.find({ program: programId, date }).lean();
    const metricValueMap = {};
    metricValues.forEach(mv => {
      const key = `${mv.member.toString()}_${mv.definition.toString()}`;
      metricValueMap[key] = mv.value;
    });

    res.render('classroomTracker', {
      user,
      program,
      attendees,
      metrics,
      date,
      attendanceMap,
      metricValueMap,
      success: req.session.success
    });

    delete req.session.success;
  } catch (err) {
    next(err);
  }
});

/**
 * POST /classroom/:id/tracker/submit
 * Submit bulk attendance and metrics for a date
 */
router.post('/classroom/:id/tracker/submit', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const programId = req.params.id;
    const { date, attendance, metrics } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Process attendance
    if (attendance && typeof attendance === 'object') {
      for (const [memberId, present] of Object.entries(attendance)) {
        if (present === 'true' || present === true) {
          // Create attendance record
          await Attendance.findOneAndUpdate(
            { program: programId, member: memberId, date },
            { program: programId, member: memberId, date },
            { upsert: true }
          );
        } else {
          // Remove attendance if unchecked
          await Attendance.deleteOne({ program: programId, member: memberId, date });
        }
      }
    }

    // Process metrics
    if (metrics && typeof metrics === 'object') {
      for (const [key, value] of Object.entries(metrics)) {
        // Key format: "memberId_metricDefId"
        const [memberId, definitionId] = key.split('_');

        if (!value || value === '') continue;

        // Get metric definition to determine type
        const metricDef = await MetricDef.findById(definitionId);
        if (!metricDef) continue;

        // Cast value based on type
        let castedValue = value;
        if (metricDef.type === 'number') {
          castedValue = parseFloat(value);
        } else if (metricDef.type === 'boolean') {
          castedValue = value === 'true' || value === true;
        }

        // Upsert metric value
        await MetricValue.findOneAndUpdate(
          { program: programId, member: memberId, definition: definitionId, date },
          { program: programId, member: memberId, definition: definitionId, date, value: castedValue },
          { upsert: true }
        );
      }
    }

    req.session.success = 'Attendance and metrics saved successfully!';
    res.redirect(`/classroom/${programId}/tracker?date=${date}`);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /classroom/:id/sync-members
 * Bulk sync all attendees to members database
 */
router.post('/classroom/:id/sync-members', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const programId = req.params.id;
    const results = await bulkSyncAttendeesToMembers(programId);

    req.session.success = `Synced ${results.synced} students to members database. ${results.skipped} already synced.`;
    res.redirect(`/classroom/${programId}/manage`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
