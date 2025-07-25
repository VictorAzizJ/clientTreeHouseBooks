const express    = require('express');
const router     = express.Router();
const Attendance = require('../models/Attendance');
const Attendee   = require('../models/Attendee');
const { ensureStaffOrAdmin } = require('./_middleware');

// Show attendance for a program on a given date
router.get('/programs/:programId/attendance', ensureStaffOrAdmin, async (req, res) => {
  const attendees = await Attendee.find({ program: req.params.programId }).lean();
  // default date = today
  const date = req.query.date ? new Date(req.query.date) : new Date();
  // fetch existing
  const records = await Attendance.find({
    date,
    attendee: { $in: attendees.map(a=>a._id) }
  }).lean();
  res.render('attendanceForm', { user: req.session.user, attendees, records, date });
});

// Submit attendance (bulk)
router.post('/programs/:programId/attendance', ensureStaffOrAdmin, async (req, res) => {
  const { date, attended } = req.body;
  // attended = array of attendee IDs present
  const dt = new Date(date);
  // remove old for that date
  await Attendance.deleteMany({ date: dt, attendee: { $in: attended } });
  // insert new present records
  await Promise.all(attended.map(id =>
    Attendance.create({ attendee: id, date: dt, present: true })
  ));
  req.session.success = 'Attendance recorded';
  res.redirect(`/programs/${req.params.programId}/attendance?date=${date}`);
});

module.exports = router;
