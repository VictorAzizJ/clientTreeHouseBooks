# Views Directory Structure

This directory contains all EJS template files for the TreeHouseBooks Dashboard.

## Directory Organization

### Core Pages
- `dashboard.ejs` - Main dashboard homepage
- `login.ejs` - User login page
- `customSignup.ejs` - User registration page

### Member Management (`/members/*`)
- `membersList.ejs` - List all members
- `memberDetails.ejs` - View individual member details
- `newMember.ejs` - Add new member form

### Program Management (`/programs/*`)
- `programsList.ejs` - List all programs
- `programDetails.ejs` - View individual program details
- `newProgram.ejs` - Create new program form

### Attendee Management (`/attendees/*`)
- `attendeesList.ejs` - List all program attendees
- `attendeeDetails.ejs` - View individual attendee details
- `newAttendee.ejs` - Add attendee to program form

### Attendance Tracking (`/attendance/*`)
- `attendanceForm.ejs` - Take attendance for a date/program

### Classroom Programs (`/classroom/*`)
- `classroomSetup.ejs` - Initial classroom setup page
- `classroomManage.ejs` - Manage classroom roster
- `classroomTracker.ejs` - Track student progress

### Book Donations (`/donations/*`)
- `donationsList.ejs` - List all book donations
- `newDonation.ejs` - Record new book donation

### Book Checkouts (`/checkouts/*`)
- `checkoutsList.ejs` - List all book checkouts
- (Checkout forms embedded in other pages)

### Data Import (`/data-import/*`)
- `dataImport.ejs` - Main import interface
- `importHistory.ejs` - View individual import record
- `importHistoryList.ejs` - List all import history

### Metrics & Reports (`/metrics/*`)
- `metricsOverview.ejs` - Dashboard metrics and charts

### Admin Functions (`/admin/*`)
- `admin.ejs` - Admin control panel
- `adminUsers.ejs` - Manage admin users
- `adminUsersList.ejs` - List admin users
- `adminUserEdit.ejs` - Edit admin user

### Password Reset (`/forgot-password`, `/reset-password`)
- `forgotPassword.ejs` - Request password reset
- `resetPassword.ejs` - Reset password with token

### Partials (Reusable Components)
Located in `views/partials/`:
- `nav.ejs` - Main navigation bar (included on all pages)
- `quickActions.ejs` - Quick action sidebar
- Additional partials as needed

## View Standards

All views MUST include:
1. **Brand CSS**: `<link rel="stylesheet" href="/css/treehouse-brand.css">`
2. **Navigation**: `<%- include('partials/nav') %>` after `<body>` tag
3. **Page Title**: Format as "Page Name - TreeHouseBooks"
4. **Bootstrap 5**: Already included via CDN
5. **Bootstrap Icons**: Already included via CDN

## Color Variables (from treehouse-brand.css)

Use these CSS variables for consistent branding:
- `var(--thb-primary)` - Olive Green (#6B8E23)
- `var(--thb-secondary)` - Sage Green (#8FBC8F)
- `var(--thb-accent)` - Terra Cotta (#D2691E)
- `var(--thb-neutral)` - Beige (#F5F5DC)
- `var(--thb-text-dark)` - Dark Green (#2F4F2F)

## Route-to-View Mapping

| Route | View File | Description |
|-------|-----------|-------------|
| `GET /` | dashboard.ejs | Main dashboard |
| `GET /login` | login.ejs | Login page |
| `GET /signup` | customSignup.ejs | Registration |
| `GET /members` | membersList.ejs | Member list |
| `GET /members/new` | newMember.ejs | Add member |
| `GET /members/:id` | memberDetails.ejs | Member details |
| `GET /programs` | programsList.ejs | Program list |
| `GET /programs/new` | newProgram.ejs | Add program |
| `GET /programs/:id` | programDetails.ejs | Program details |
| `GET /attendees` | attendeesList.ejs | Attendee list |
| `GET /attendees/new/:programId` | newAttendee.ejs | Add attendee |
| `GET /attendees/:id` | attendeeDetails.ejs | Attendee details |
| `GET /attendance/form` | attendanceForm.ejs | Take attendance |
| `GET /classroom/setup` | classroomSetup.ejs | Setup classroom |
| `GET /classroom/:id/manage` | classroomManage.ejs | Manage classroom |
| `GET /classroom/:id/tracker` | classroomTracker.ejs | Track progress |
| `GET /donations` | donationsList.ejs | Donation list |
| `GET /donations/new` | newDonation.ejs | Record donation |
| `GET /members/:id/donations/new` | newDonation.ejs | Record donation (for member) |
| `GET /checkouts` | checkoutsList.ejs | Checkout list |
| `GET /data-import` | dataImport.ejs | Import interface |
| `GET /data-import/history` | importHistoryList.ejs | Import history |
| `GET /data-import/history/:id` | importHistory.ejs | Import record |
| `GET /metrics` | metricsOverview.ejs | Metrics dashboard |
| `GET /admin` | admin.ejs | Admin panel |
| `GET /admin/users` | adminUsersList.ejs | Admin user list |
| `GET /admin/users/:id/edit` | adminUserEdit.ejs | Edit admin user |
| `GET /forgot-password` | forgotPassword.ejs | Password reset request |
| `GET /reset-password/:token` | resetPassword.ejs | Password reset form |

## Troubleshooting

If a page returns 404:
1. Check that the view file exists in this directory
2. Verify the route is registered in the appropriate route file
3. Ensure route file is mounted in `server.js`
4. Check server logs for route registration confirmation
5. Verify view filename matches exactly what's in `res.render()` call

## Last Updated
2025-10-17
