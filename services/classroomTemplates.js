// services/classroomTemplates.js
//
// ═══════════════════════════════════════════════════════════════════════════
// CLASSROOM PROGRAM TEMPLATES & SETUP
// ═══════════════════════════════════════════════════════════════════════════
//
// This service handles setup and configuration of classroom-based programs,
// including automatic metric creation, attendee-to-member syncing, and
// template initialization.
//
// ═══════════════════════════════════════════════════════════════════════════

const MetricDef = require('../models/MetricDefinition');
const Member = require('../models/Member');
const Attendee = require('../models/Attendee');

/**
 * Default classroom metrics template
 * These are automatically created when a classroom program is initialized
 */
const CLASSROOM_METRICS_TEMPLATE = [
  {
    name: 'Attendance',
    type: 'boolean',
    description: 'Student attended the session'
  },
  {
    name: 'Behavior Score',
    type: 'number',
    description: 'Behavior rating (1-5 scale)'
  },
  {
    name: 'Homework Completed',
    type: 'boolean',
    description: 'Student completed homework assignment'
  },
  {
    name: 'Reading Level',
    type: 'text',
    description: 'Current reading level assessment'
  },
  {
    name: 'Math Grade',
    type: 'text',
    description: 'Math assignment grade (A-F)'
  },
  {
    name: 'Participation',
    type: 'number',
    description: 'Class participation (1-5 scale)'
  },
  {
    name: 'Notes',
    type: 'text',
    description: 'Teacher notes and observations'
  }
];

/**
 * Initialize classroom program with default metrics
 * Creates standard metric definitions for tracking student progress
 *
 * @param {ObjectId} programId - Program ID
 * @param {Object} customMetrics - Additional custom metrics to create
 * @returns {Promise<Array>} Created metric definitions
 */
async function initializeClassroomMetrics(programId, customMetrics = []) {
  const metricsToCreate = [...CLASSROOM_METRICS_TEMPLATE, ...customMetrics];
  const created = [];

  for (const metricTemplate of metricsToCreate) {
    // Check if metric already exists
    const existing = await MetricDef.findOne({
      program: programId,
      name: metricTemplate.name
    });

    if (!existing) {
      const metric = await MetricDef.create({
        program: programId,
        name: metricTemplate.name,
        type: metricTemplate.type
      });
      created.push(metric);
    }
  }

  return created;
}

/**
 * Sync attendee to members database
 * Creates a child member record and optionally links to parent
 *
 * @param {Object} attendee - Attendee document
 * @param {ObjectId} parentMemberId - Parent member ID (optional)
 * @returns {Promise<Object>} Created or updated member
 */
async function syncAttendeeToMember(attendee, parentMemberId = null) {
  // Check if attendee already has a member
  if (attendee.member) {
    const existingMember = await Member.findById(attendee.member);
    if (existingMember) {
      // Update existing member with latest info
      existingMember.dateOfBirth = attendee.dateOfBirth || existingMember.dateOfBirth;
      existingMember.grade = attendee.grade || existingMember.grade;
      existingMember.school = attendee.school || existingMember.school;

      if (parentMemberId && !existingMember.parent) {
        existingMember.parent = parentMemberId;
      }

      await existingMember.save();
      return existingMember;
    }
  }

  // Generate unique email if not provided
  const email = attendee.email ||
    `${attendee.firstName.toLowerCase()}.${attendee.lastName.toLowerCase()}.${Date.now()}@student.treehouse.local`;

  // Create new child member
  const memberData = {
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    email: email,
    phone: attendee.phone,
    memberType: 'child',
    dateOfBirth: attendee.dateOfBirth,
    grade: attendee.grade,
    school: attendee.school,
    parent: parentMemberId
  };

  const member = await Member.create(memberData);

  // Link attendee to member
  attendee.member = member._id;
  if (parentMemberId) {
    attendee.parentMember = parentMemberId;
  }
  await attendee.save();

  return member;
}

/**
 * Bulk sync all attendees in a program to members
 * Useful for initializing classroom programs
 *
 * @param {ObjectId} programId - Program ID
 * @returns {Promise<Object>} Summary of sync results
 */
async function bulkSyncAttendeesToMembers(programId) {
  const attendees = await Attendee.find({ program: programId });
  const results = {
    synced: 0,
    skipped: 0,
    errors: []
  };

  for (const attendee of attendees) {
    try {
      if (!attendee.member) {
        await syncAttendeeToMember(attendee, attendee.parentMember);
        results.synced++;
      } else {
        results.skipped++;
      }
    } catch (err) {
      results.errors.push({
        attendee: `${attendee.firstName} ${attendee.lastName}`,
        error: err.message
      });
    }
  }

  return results;
}

/**
 * Get or create parent member
 * Helper function to find existing parent or create new one
 *
 * @param {Object} parentInfo - Parent information
 * @returns {Promise<Object>} Parent member document
 */
async function getOrCreateParent(parentInfo) {
  const { firstName, lastName, email, phone, address } = parentInfo;

  // Try to find existing parent by email
  if (email) {
    const existing = await Member.findOne({ email: email.toLowerCase() });
    if (existing) return existing;
  }

  // Create new parent member
  const parent = await Member.create({
    firstName,
    lastName,
    email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now()}@parent.treehouse.local`,
    phone,
    address,
    memberType: 'adult'
  });

  return parent;
}

/**
 * Add student to classroom program
 * Creates attendee, syncs to member database, and links to parent
 *
 * @param {ObjectId} programId - Program ID
 * @param {Object} studentInfo - Student information
 * @param {Object} parentInfo - Parent/guardian information
 * @returns {Promise<Object>} Created attendee and member
 */
async function addStudentToClassroom(programId, studentInfo, parentInfo = null) {
  // Get or create parent if provided
  let parent = null;
  if (parentInfo) {
    parent = await getOrCreateParent(parentInfo);
  }

  // Create attendee
  const attendee = await Attendee.create({
    program: programId,
    firstName: studentInfo.firstName,
    lastName: studentInfo.lastName,
    dateOfBirth: studentInfo.dateOfBirth,
    grade: studentInfo.grade,
    school: studentInfo.school,
    email: studentInfo.email,
    phone: studentInfo.phone,
    parentMember: parent?._id
  });

  // Sync to member database
  const member = await syncAttendeeToMember(attendee, parent?._id);

  return {
    attendee,
    member,
    parent
  };
}

/**
 * Get classroom program summary
 * Returns overview stats for a classroom program
 *
 * @param {ObjectId} programId - Program ID
 * @returns {Promise<Object>} Program summary
 */
async function getClassroomSummary(programId) {
  const attendees = await Attendee.find({ program: programId })
    .populate('member')
    .populate('parentMember')
    .lean();

  const metrics = await MetricDef.find({ program: programId }).lean();

  const summary = {
    totalStudents: attendees.length,
    syncedToMembers: attendees.filter(a => a.member).length,
    withParents: attendees.filter(a => a.parentMember).length,
    metrics: metrics.length,
    gradeDistribution: {},
    attendees
  };

  // Calculate grade distribution
  attendees.forEach(a => {
    if (a.grade) {
      summary.gradeDistribution[a.grade] = (summary.gradeDistribution[a.grade] || 0) + 1;
    }
  });

  return summary;
}

module.exports = {
  CLASSROOM_METRICS_TEMPLATE,
  initializeClassroomMetrics,
  syncAttendeeToMember,
  bulkSyncAttendeesToMembers,
  getOrCreateParent,
  addStudentToClassroom,
  getClassroomSummary
};
