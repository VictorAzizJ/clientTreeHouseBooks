# Email Templates - Admin Guide

## Overview

The Email Templates feature allows administrators to customize automated emails sent by the system without requiring code changes. Templates support dynamic placeholders that are replaced with actual data when emails are sent.

**Key Benefits:**
- Customize email content without developer involvement
- Preview templates before saving
- Enable/disable templates without deleting them
- Track all email send attempts with detailed logs
- Automatic fallback to default templates if database is unavailable

---

## Accessing Email Templates

### From the Navigation

1. Click **Admin** in the main navigation (admin users only)
2. Select **Email Templates**

### Direct URL

| Page | URL |
|------|-----|
| Template List | `/admin/email-templates` |
| Edit Template | `/admin/email-templates/:id/edit` |
| Email Logs | `/admin/email-logs` |

---

## Available Templates

### Donation Thank You

**Template Key:** `donation_thank_you`

Automatically sent when a book donation is recorded, if:
- The donor has an email address on file
- The template is enabled (active)
- Email service is configured

**Available Placeholders:**

| Placeholder | Description |
|-------------|-------------|
| `{{donorName}}` | Name of the donor |
| `{{bookCount}}` | Number of books donated |
| `{{donationDate}}` | Date of the donation (formatted) |
| `{{notes}}` | Any notes about the donation |

### Welcome New Member

**Template Key:** `welcome_member`

Optional welcome email for new member registrations. Disabled by default.

**Available Placeholders:**

| Placeholder | Description |
|-------------|-------------|
| `{{memberName}}` | Name of the new member |
| `{{memberEmail}}` | Email of the new member |

---

## Managing Templates

### Viewing Templates

The template list shows all available templates with:
- **Status badge** (Active/Disabled)
- **Template name** and description
- **Subject line** preview
- **Available placeholders** for quick reference
- **Last modified** timestamp

### Editing a Template

1. Click **Edit** on any template card
2. Modify the following fields:
   - **Template Name** - Display name for the template
   - **Email Subject** - Subject line (can include placeholders)
   - **Active Status** - Toggle to enable/disable the template
   - **HTML Body** - The email content with HTML formatting
   - **Plain Text Body** - Fallback text version (optional)

3. Use the **Preview** button to see how the email will look
4. Click **Save Template** to apply changes

### Using Placeholders

Placeholders are dynamic tokens replaced with actual data when emails are sent.

**Format:** `{{placeholderName}}`

**Example:**
```html
<p>Dear {{donorName}},</p>
<p>Thank you for donating {{bookCount}} books!</p>
```

**Result (when sent):**
```html
<p>Dear Jane Smith,</p>
<p>Thank you for donating 5 books!</p>
```

### Conditional Content

You can show content only when a field has a value:

```html
{{#if notes}}
<p>Notes: {{notes}}</p>
{{/if}}
```

This section will only appear if `notes` has a value.

### Enabling/Disabling Templates

1. Click the toggle button on any template card, OR
2. Edit the template and change the **Active Status** checkbox

When a template is disabled:
- Emails for that trigger will not be sent
- The template is preserved for future use
- You can re-enable it at any time

### Resetting to Defaults

If you need to restore the original templates:

1. Click **Reset to Defaults** at the top of the template list
2. Confirm the action

This will overwrite current templates with the system defaults.

---

## Email Logs

### Accessing Logs

1. Go to **Admin** > **Email Templates**
2. Click **View Send Logs**

Or navigate directly to `/admin/email-logs`

### Understanding Logs

Each log entry shows:

| Column | Description |
|--------|-------------|
| **Time** | When the email was attempted |
| **Status** | Sent, Failed, or Skipped |
| **Template** | Which template was used |
| **Recipient** | Email address |
| **Subject** | Email subject line |
| **Details** | Message ID (if sent) or error message (if failed) |

### Status Types

| Status | Meaning |
|--------|---------|
| **Sent** | Email delivered successfully to mail server |
| **Failed** | Email sending failed (see error details) |
| **Skipped** | Email not sent (service not configured or template disabled) |

### Filtering Logs

Use the filter controls to:
- Filter by **Status** (Sent, Failed, Skipped)
- Filter by **Template**
- Adjust the number of records shown

---

## Email Service Configuration

Email templates require the email service to be configured. If emails show as "Skipped" in the logs, the email service may not be set up.

### Required Environment Variables

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=TreeHouse Books <your-email@domain.com>
```

### Testing Configuration

1. Record a test donation for a member with an email address
2. Check the Email Logs to verify the email was sent
3. Look for "Sent" status with a Message ID

---

## Troubleshooting

### "Skipped - Email service not configured"

**Cause:** EMAIL_USER and EMAIL_PASSWORD environment variables are not set.

**Solution:** Configure email environment variables in your deployment settings.

### "Skipped - No template available"

**Cause:** The template for this trigger is disabled or doesn't exist.

**Solution:** Enable the template or run "Reset to Defaults" to create it.

### "Failed" with error message

**Cause:** Email sending failed at the SMTP level.

**Common errors:**
- "Invalid login" - Check EMAIL_PASSWORD
- "Connection timeout" - Check EMAIL_HOST and EMAIL_PORT
- "Invalid recipient" - Check the recipient email address

### Emails not being sent for donations

Check that:
1. The donor has an email address in their member profile
2. The `donation_thank_you` template is enabled
3. Email service is configured (check logs for "skipped" entries)

### Template changes not taking effect

1. Templates are loaded fresh for each email
2. Changes take effect immediately
3. If still not working, check the Email Logs for errors

---

## Best Practices

### Writing Effective Templates

1. **Keep it concise** - Recipients appreciate brief, clear messages
2. **Use placeholders** - Personalization increases engagement
3. **Test thoroughly** - Use Preview before saving
4. **Include branding** - Consistent styling builds trust
5. **Provide contact info** - Let recipients know how to reach you

### Template HTML Guidelines

- Use inline CSS (email clients have limited CSS support)
- Avoid JavaScript (blocked by most email clients)
- Use tables for layout (better email client compatibility)
- Keep images minimal (may not load)
- Always provide a plain text version

### Monitoring

- Review Email Logs weekly for failed deliveries
- Track "Failed" status patterns to identify issues
- Monitor "Sent" count to ensure automation is working

---

## Quick Reference

```
┌────────────────────────────────────────────────────────────┐
│          EMAIL TEMPLATES - QUICK REFERENCE                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  PLACEHOLDER FORMAT:                                       │
│    {{fieldName}} - Replaced with actual value              │
│    {{#if field}}...{{/if}} - Conditional content           │
│                                                            │
│  KEY URLS:                                                 │
│    Templates List:  /admin/email-templates                 │
│    Edit Template:   /admin/email-templates/:id/edit        │
│    Email Logs:      /admin/email-logs                      │
│    Seed Defaults:   /admin/email-templates/seed            │
│                                                            │
│  LOG STATUSES:                                             │
│    ✓ Sent     - Email delivered to mail server             │
│    ✗ Failed   - Sending error (check details)              │
│    ○ Skipped  - Not sent (disabled or not configured)      │
│                                                            │
│  ACCESS: Admin users only                                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | February 2026 | Initial release with donation thank-you template |

---

*Document created for TreeHouse Books Admin Users*
