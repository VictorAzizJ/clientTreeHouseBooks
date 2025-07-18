const express   = require('express');
const router    = express.Router();
const Program   = require('../models/Program');
const Attendee  = require('../models/Attendee');
const { ensureStaffOrAdmin } = require('./_middleware');

// Form to register a new attendee under a program
router.get('/programs/:programId/attendees/new', ensureStaffOrAdmin, async (req, res) => {
  const program = await Program.findById(req.params.programId).lean();
  res.render('newAttendee', { user: req.session.user, program });
});

// Handle attendee creation
router.post('/programs/:programId/attendees', ensureStaffOrAdmin, async (req, res) => {
  const { firstName, lastName } = req.body;
  await Attendee.create({
    program:   req.params.programId,
    firstName,
    lastName
  });
  req.session.success = 'Attendee registered';
  res.redirect(`/programs/${req.params.programId}`);
});

// List attendees of a program
router.get('/programs/:programId/attendees', ensureStaffOrAdmin, async (req, res) => {
  const attendees = await Attendee.find({ program: req.params.programId }).lean();
  res.render('attendeesList', { user: req.session.user, attendees });
});

// View single attendee (you’ll embed attendance & metrics here next)
router.get('/programs/:programId/attendees/:id', ensureStaffOrAdmin, async (req, res) => {
  const attendee = await Attendee.findById(req.params.id).lean();
  // We'll pull attendance & metric data into the next step
  res.render('attendeeDetails', { user: req.session.user, attendee });
});

module.exports = router;
