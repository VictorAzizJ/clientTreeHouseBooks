/**
 * ROUTE MAP - Complete list of all routes in the application
 * This file is for reference and debugging only
 * Last updated: 2025-10-17
 */

module.exports = {
  // Authentication & Login
  auth: [
    'GET  /login',
    'GET  /signup',
    'POST /signup',
    'GET  /logout'
  ],

  // Dashboard & Main
  dashboard: [
    'GET  /',
    'GET  /dashboard'
  ],

  // Members Management
  members: [
    'GET  /members',
    'GET  /members/new',
    'POST /members/create',
    'GET  /members/:id',
    'GET  /members/search'
  ],

  // Programs Management
  programs: [
    'GET  /programs',
    'GET  /programs/new',
    'POST /programs/create',
    'GET  /programs/:id'
  ],

  // Attendees Management
  attendees: [
    'GET  /attendees',
    'GET  /attendees/new/:programId',
    'POST /attendees/create',
    'GET  /attendees/:id'
  ],

  // Attendance Tracking
  attendance: [
    'GET  /attendance',
    'GET  /attendance/form',
    'POST /attendance/record'
  ],

  // Classroom Programs
  classroom: [
    'GET  /classroom/setup',
    'POST /classroom/create',
    'GET  /classroom/:id/manage',
    'POST /classroom/:id/add-student',
    'GET  /classroom/:id/tracker',
    'POST /classroom/:id/tracker/submit',
    'POST /classroom/:id/sync-members'
  ],

  // Book Donations
  donations: [
    'GET  /donations',
    'GET  /donations/new',
    'GET  /members/:memberId/donations/new',
    'POST /donations/create'
  ],

  // Book Checkouts
  checkouts: [
    'GET  /checkouts',
    'POST /checkouts/create',
    'POST /checkouts/:id/return'
  ],

  // Data Import
  dataImport: [
    'GET  /data-import',
    'POST /data-import/members',
    'POST /data-import/books',
    'GET  /data-import/history'
  ],

  // Metrics & Reports
  metrics: [
    'GET  /metrics',
    'GET  /metrics/overview'
  ],

  // Admin Functions
  admin: [
    'GET  /admin',
    'GET  /admin/users',
    'POST /admin/users/create',
    'GET  /admin/users/:id/edit',
    'POST /admin/users/:id/update',
    'POST /admin/users/:id/delete'
  ],

  // Password Reset
  passwordReset: [
    'GET  /forgot-password',
    'POST /forgot-password',
    'GET  /reset-password/:token',
    'POST /reset-password/:token'
  ],

  // Notifications & Messages
  notifications: [
    'GET  /notifications'
  ],
  messages: [
    'GET  /messages'
  ],

  // Dashboard Preferences
  dashboardPreferences: [
    'GET  /dashboard-preferences',
    'POST /dashboard-preferences/save'
  ]
};
