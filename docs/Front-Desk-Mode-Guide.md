# Front Desk Mode - User Guide

## Overview

Front Desk Mode is a restricted access feature designed for staff and admin users who need to set up a workstation for public use at the front desk. When activated, the system limits access to only essential front desk functions, preventing unauthorized access to sensitive administrative features.

**Key Benefits:**
- Secure public-facing workstations
- Simplified interface for front desk tasks
- Password protection to exit (prevents unauthorized access to full system)
- Automatic visitor check-in when registering new members

---

## Who Can Use Front Desk Mode?

- **Staff Users** - Full access to enter/exit front desk mode
- **Admin Users** - Full access to enter/exit front desk mode
- **Volunteers** - Cannot enter front desk mode

---

## How to Enter Front Desk Mode

### Step 1: Navigate to Your Dashboard
Log in to the system and go to your dashboard (`/dashboard`).

### Step 2: Locate the Front Desk Mode Card
At the top of both the Staff Dashboard and Admin Dashboard, you will see a yellow/amber card labeled "Front Desk Mode."

![Front Desk Mode Card]
```
┌─────────────────────────────────────────────────────────────────┐
│  🖥️ Front Desk Mode                                             │
│  Restrict access to essential front desk functions only.        │
│  Password required to exit.                                     │
│                                          [Enter Front Desk Mode]│
└─────────────────────────────────────────────────────────────────┘
```

### Step 3: Click "Enter Front Desk Mode"
Click the button to activate front desk mode. You will see a confirmation message:

> "Front desk mode activated. Access is now limited to essential functions."

---

## What's Available in Front Desk Mode

### Dashboard
The front desk dashboard displays:
- Quick stats (Total Visits, Total Members, Total Checkouts)
- Six large action cards for common tasks
- Recent visitor check-ins table

### Available Actions

| Action | Description | Route |
|--------|-------------|-------|
| **Visitor Sign In** | Check in visitors to the library | `/visitor-checkin` |
| **New Member** | Register new library members | `/members/new` |
| **Book Checkout** | Check out books to members | `/checkouts/new` |
| **Book Donation** | Record book donations | `/donations/new` |
| **New Organization** | Add partner organizations | `/organizations/new` |
| **Search Members** | Find and view member records | `/members` |

### Full List of Allowed Routes

**Visitor Management:**
- `/visitor-checkin` - Visitor check-in form
- `/visits` - View all visits

**Member Management:**
- `/members` - View all members
- `/members/new` - Add new member
- `/members/:id` - View member details (read-only)
- `/api/members/search` - Member search API

**Book Operations:**
- `/checkouts` - View all checkouts
- `/checkouts/new` - New checkout
- `/donations` - View all donations
- `/donations/new` - New donation

**Organizations:**
- `/organizations` - View all organizations
- `/organizations/new` - Add new organization

**System:**
- `/dashboard` - Front desk dashboard
- `/front-desk/exit` - Exit front desk mode
- `/logout` - Log out

---

## What's Blocked in Front Desk Mode

The following features are **NOT** accessible in front desk mode:

### Navigation Menus Hidden:
- **Programs** dropdown (all program management)
- **Traveling** dropdown (Traveling Tree House)
- **Tools** dropdown (Import, Notifications, Messages)
- **Admin** dropdown (User management, System settings)

### Blocked Actions:
- Editing member records (`/members/:id/edit`)
- Deleting any records
- Program management
- Attendance tracking
- Metrics and reports
- Data import/export
- User administration
- System settings

**When attempting to access a blocked route:**
> "This feature is not available in Front Desk Mode. Exit front desk mode to access all features."

---

## How to Exit Front Desk Mode

### Step 1: Click the Front Desk Mode Badge
In the navigation bar, you'll see an amber badge with a pulsing indicator:

```
[● Front Desk Mode]
```

Click this badge, or click "Exit Front Desk Mode" on the dashboard.

### Step 2: Enter Your Password
You will be taken to a password verification screen showing:
- Your name and email
- A password field

Enter your account password to verify your identity.

### Step 3: Confirm Exit
Click "Exit Front Desk Mode" to restore full access.

**On successful exit:**
> "Front desk mode deactivated. Full access restored."

**If password is incorrect:**
> "Incorrect password. Please try again."

---

## Automatic Visitor Check-In

### How It Works
When a new member is registered while in Front Desk Mode, the system automatically creates a visitor check-in record for that member.

### Visit Record Details
- **Visit Date:** Current date and time
- **Purpose:** "New member registration"
- **Notes:** "Auto-created during front desk registration"
- **Recorded By:** The logged-in staff/admin user

### Success Message
When a member is created in front desk mode, you'll see:
> "Member created and checked in as visitor"

This eliminates the need to separately check in new members after registration.

---

## Visual Indicators

### Navigation Bar
When front desk mode is active:
- An amber "Front Desk Mode" badge appears in the navigation
- The badge has a pulsing white dot to indicate active status
- Programs, Traveling, Tools, and Admin menus are hidden

### Dashboard
- The front desk dashboard has an amber banner at the top
- Large, easy-to-click action cards
- Simplified interface focused on common tasks

---

## Security Considerations

1. **Password Required to Exit:** Only users who know their password can exit front desk mode, preventing unauthorized access to administrative functions.

2. **Session-Based:** Front desk mode is tied to the user's session. Logging out will end the session entirely.

3. **Edit/Delete Blocked:** Even for allowed routes, edit and delete operations are blocked to prevent accidental or malicious data modification.

4. **Audit Trail:** All actions performed in front desk mode are still logged with the user's identity.

---

## Troubleshooting

### "Only staff members can enter front desk mode"
**Cause:** You are logged in as a volunteer.
**Solution:** Log in with a staff or admin account.

### "This feature is not available in Front Desk Mode"
**Cause:** You attempted to access a restricted route.
**Solution:** Exit front desk mode to access full features, or use only the allowed functions.

### "Incorrect password"
**Cause:** The password entered does not match your account.
**Solution:** Enter your correct account password. If forgotten, log out and use the password reset feature.

### "User not found"
**Cause:** Session issue.
**Solution:** Log out and log back in.

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────────┐
│              FRONT DESK MODE - QUICK REFERENCE             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ENTER:  Dashboard → Click "Enter Front Desk Mode"         │
│                                                            │
│  EXIT:   Click amber badge in nav → Enter password         │
│                                                            │
│  ALLOWED ACTIONS:                                          │
│    ✓ Visitor Sign In      ✓ Book Checkout                 │
│    ✓ New Member           ✓ Book Donation                 │
│    ✓ Search Members       ✓ New Organization              │
│    ✓ View Records                                          │
│                                                            │
│  BLOCKED ACTIONS:                                          │
│    ✗ Edit/Delete Records  ✗ Programs                      │
│    ✗ Admin Functions      ✗ Data Import                   │
│    ✗ User Management      ✗ Reports                       │
│                                                            │
│  AUTO VISITOR: New members auto-checked in as visitors     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | February 2026 | Initial release |

---

*Document created for TreeHouseBooks Staff and Admin Users*
