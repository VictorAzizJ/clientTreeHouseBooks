// services/mailer.js
// ═════════════════════════════════════════════════════════════════════════════
// EMAIL SERVICE - Nodemailer configuration for sending emails
// ═════════════════════════════════════════════════════════════════════════════
//
// This service handles all email sending for the application:
// - Password reset emails
// - Thank-you emails for book checkouts/donations
// - Admin notifications
//
// ─────────────────────────────────────────────────────────────────────────────
// 🔧 CONFIGURATION INSTRUCTIONS (for Google Workspace / Gmail)
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Add these environment variables to your .env file (local) or Render dashboard (production):
//
//    EMAIL_HOST=smtp.gmail.com
//    EMAIL_PORT=587
//    EMAIL_SECURE=false
//    EMAIL_USER=your-email@yourdomain.org          # Your Google Workspace email
//    EMAIL_PASSWORD=your-app-specific-password     # See step 2 below
//    EMAIL_FROM=TreeHouse Books <your-email@yourdomain.org>
//
// 2. Generate an App-Specific Password (required for Gmail/Google Workspace):
//
//    Regular Gmail password won't work due to security restrictions.
//    Follow these steps:
//
//    a) Go to your Google Account: https://myaccount.google.com/
//    b) Navigate to Security → 2-Step Verification (you MUST enable 2FA first)
//    c) Scroll to "App passwords" at the bottom
//    d) Click "App passwords" → Select app: "Mail" → Select device: "Other (Custom name)"
//    e) Enter "TreeHouse Dashboard" → Click Generate
//    f) Copy the 16-character password (no spaces)
//    g) Use this as your EMAIL_PASSWORD environment variable
//
// 3. For Google Workspace admins:
//
//    If using a Google Workspace account (e.g., admin@treehousebooks.org):
//    - Make sure SMTP is enabled in Admin Console → Apps → Google Workspace → Gmail → End user access
//    - Less secure apps: Not needed if using app-specific passwords
//
// 4. Testing your configuration:
//
//    You can test email sending by uncommenting the test function at the bottom of this file
//    and running: node services/mailer.js
//
// ─────────────────────────────────────────────────────────────────────────────

const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

// ─── Email Log Model (inline to avoid circular dependencies) ────────────────
const emailLogSchema = new mongoose.Schema({
  templateKey: String,
  recipient: { type: String, required: true },
  subject: String,
  status: { type: String, enum: ['sent', 'failed', 'skipped'], required: true },
  messageId: String,
  error: String,
  metadata: mongoose.Schema.Types.Mixed, // Additional context (donationId, memberId, etc.)
  sentAt: { type: Date, default: Date.now }
});

// Only create the model if it doesn't already exist
const EmailLog = mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);

// ─── Create Transporter ──────────────────────────────────────────────────────
// This is the email client that connects to your SMTP server

let transporter = null;

function createTransporter() {
  // Check if required email environment variables are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️  Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD environment variables.');
    console.warn('⚠️  Emails will not be sent until configured. See services/mailer.js for setup instructions.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    // Helpful for debugging connection issues
    debug: process.env.NODE_ENV !== 'production',
    logger: process.env.NODE_ENV !== 'production'
  });
}

// Initialize transporter on module load
transporter = createTransporter();

// ─── Send Password Reset Email ───────────────────────────────────────────────
/**
 * Send a password reset email with a unique token link
 *
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Unique reset token (stored in User.resetToken)
 * @param {string} firstName - User's first name for personalization
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(email, resetToken, firstName) {
  if (!transporter) {
    console.error('❌ Cannot send password reset email: Email service not configured');
    throw new Error('Email service is not configured. Please contact an administrator.');
  }

  const resetUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"TreeHouse Books" <noreply@treehousebooks.org>',
    to: email,
    subject: 'Password Reset Request - TreeHouse Books',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5f2d;">Password Reset Request</h2>
        <p>Hi ${firstName},</p>
        <p>You requested a password reset for your TreeHouse Books account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #2c5f2d; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          <strong>This link expires in 1 hour.</strong>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this reset, please ignore this email. Your password will remain unchanged.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          TreeHouse Books Dashboard<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    `,
    text: `
      Hi ${firstName},

      You requested a password reset for your TreeHouse Books account.

      Click this link to reset your password:
      ${resetUrl}

      This link expires in 1 hour.

      If you didn't request this reset, please ignore this email. Your password will remain unchanged.

      TreeHouse Books Dashboard
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email. Please try again later.');
  }
}

// ─── Send Checkout Thank You Email ──────────────────────────────────────────
/**
 * Send a thank-you email after book checkout
 *
 * @param {string} email - Member email address
 * @param {string} firstName - Member's first name
 * @param {object} details - Checkout details
 * @param {number} details.numberOfBooks - Number of books checked out
 * @param {string[]} details.genres - Array of genres (optional)
 * @param {number} details.weight - Total weight in lbs (optional)
 * @returns {Promise<void>}
 */
async function sendCheckoutThankYouEmail(email, firstName, details) {
  if (!transporter) {
    console.warn('⚠️  Email service not configured. Thank-you email not sent.');
    return; // Fail silently for thank-you emails (non-critical)
  }

  const { numberOfBooks, genres, weight } = details;
  const genreList = genres && genres.length > 0
    ? genres.join(', ')
    : 'various genres';

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"TreeHouse Books" <noreply@treehousebooks.org>',
    to: email,
    subject: 'Thank You for Visiting TreeHouse Books!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c5f2d; margin: 0;">📚 Thank You!</h1>
        </div>

        <p style="font-size: 16px;">Hi ${firstName},</p>

        <p style="font-size: 16px;">
          Thank you for visiting TreeHouse Books! We're delighted you found books to enjoy.
        </p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c5f2d; margin-top: 0;">Your Checkout Summary:</h3>
          <ul style="font-size: 15px; line-height: 1.8;">
            <li><strong>Books checked out:</strong> ${numberOfBooks}</li>
            ${genres && genres.length > 0 ? `<li><strong>Genres:</strong> ${genreList}</li>` : ''}
            ${weight ? `<li><strong>Weight:</strong> ${weight} lbs</li>` : ''}
          </ul>
        </div>

        <p style="font-size: 16px;">
          Happy reading! We hope you enjoy your selections.
        </p>

        <p style="font-size: 16px;">
          Please remember to return or renew your books when you're finished.
          Feel free to visit us again anytime!
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

        <p style="color: #666; font-size: 13px; text-align: center;">
          <strong>TreeHouse Books</strong><br>
          Building community through books 📖<br>
          <em>This is an automated message. Please do not reply.</em>
        </p>
      </div>
    `,
    text: `
Hi ${firstName},

Thank you for visiting TreeHouse Books! We're delighted you found books to enjoy.

Your Checkout Summary:
- Books checked out: ${numberOfBooks}
${genres && genres.length > 0 ? `- Genres: ${genreList}` : ''}
${weight ? `- Weight: ${weight} lbs` : ''}

Happy reading! We hope you enjoy your selections.

Please remember to return or renew your books when you're finished.
Feel free to visit us again anytime!

---
TreeHouse Books
Building community through books
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Checkout thank-you email sent to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending checkout thank-you email:', error);
    // Don't throw - thank-you emails are non-critical
  }
}

// ─── Helper: Replace Placeholders in Template ──────────────────────────────
/**
 * Replace {{placeholder}} tokens in a template string with actual values
 * @param {string} template - Template string with {{placeholders}}
 * @param {object} data - Key-value pairs for replacement
 * @returns {string} - Template with placeholders replaced
 */
function replacePlaceholders(template, data) {
  if (!template) return '';

  let result = template;

  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(placeholder, value || '');
  }

  // Handle conditional blocks {{#if field}}...{{/if}}
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, field, content) => {
    return data[field] ? content : '';
  });

  return result;
}

// ─── Log Email Send Attempt ─────────────────────────────────────────────────
/**
 * Log email send attempt to database
 * @param {object} logData - Log data
 */
async function logEmailSend(logData) {
  try {
    await EmailLog.create(logData);
  } catch (err) {
    console.error('Failed to log email send:', err.message);
  }
}

// ─── Send Email Using Database Template ─────────────────────────────────────
/**
 * Send an email using a database-stored template
 * Falls back to provided defaults if template not found or inactive
 *
 * @param {string} templateKey - Template identifier (e.g., 'donation_thank_you')
 * @param {string} recipientEmail - Recipient email address
 * @param {object} placeholderData - Data to replace placeholders
 * @param {object} metadata - Additional context for logging (e.g., donationId)
 * @param {object} fallback - Fallback template if database template not found
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendTemplatedEmail(templateKey, recipientEmail, placeholderData, metadata = {}, fallback = null) {
  // Check if email service is configured
  if (!transporter) {
    console.warn(`⚠️  Email service not configured. ${templateKey} email not sent to ${recipientEmail}`);
    await logEmailSend({
      templateKey,
      recipient: recipientEmail,
      status: 'skipped',
      error: 'Email service not configured',
      metadata
    });
    return { success: false, error: 'Email service not configured' };
  }

  let template = null;
  let subject, htmlBody, textBody;

  // Try to get template from database
  try {
    const EmailTemplate = require('../models/EmailTemplate');
    template = await EmailTemplate.getByKey(templateKey);
  } catch (err) {
    console.warn(`⚠️  Could not fetch email template "${templateKey}":`, err.message);
  }

  if (template) {
    // Use database template
    subject = replacePlaceholders(template.subject, placeholderData);
    htmlBody = replacePlaceholders(template.htmlBody, placeholderData);
    textBody = replacePlaceholders(template.textBody, placeholderData);
  } else if (fallback) {
    // Use provided fallback template
    subject = replacePlaceholders(fallback.subject, placeholderData);
    htmlBody = replacePlaceholders(fallback.htmlBody, placeholderData);
    textBody = replacePlaceholders(fallback.textBody, placeholderData);
    console.log(`ℹ️  Using fallback template for "${templateKey}"`);
  } else {
    console.warn(`⚠️  No template found for "${templateKey}" and no fallback provided. Email not sent.`);
    await logEmailSend({
      templateKey,
      recipient: recipientEmail,
      status: 'skipped',
      error: 'No template available',
      metadata
    });
    return { success: false, error: 'No template available' };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"TreeHouse Books" <noreply@treehousebooks.org>',
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: textBody
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ ${templateKey} email sent to ${recipientEmail}: ${info.messageId}`);

    await logEmailSend({
      templateKey,
      recipient: recipientEmail,
      subject,
      status: 'sent',
      messageId: info.messageId,
      metadata
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending ${templateKey} email to ${recipientEmail}:`, error.message);

    await logEmailSend({
      templateKey,
      recipient: recipientEmail,
      subject,
      status: 'failed',
      error: error.message,
      metadata
    });

    return { success: false, error: error.message };
  }
}

// ─── Send Donation Thank You Email ──────────────────────────────────────────
/**
 * Send a thank-you email after book donation
 * Uses database template if available, falls back to hardcoded template
 *
 * @param {string} email - Member email address
 * @param {string} firstName - Member's first name
 * @param {object} details - Donation details
 * @param {number} details.numberOfBooks - Number of books donated
 * @param {string[]} details.genres - Array of genres (optional)
 * @param {number} details.weight - Total weight in lbs (optional)
 * @param {string} details.donationId - Donation record ID (optional, for logging)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendDonationThankYouEmail(email, donorName, details) {
  const { numberOfBooks, donationType, valuePerBook, totalValue, donationId, isOrganization } = details;

  // Build value description based on donation type
  let valueDescription = '';
  if (donationType === 'used' && valuePerBook) {
    valueDescription = `that you valued $${valuePerBook} per book`;
  } else if (donationType === 'new' && totalValue) {
    valueDescription = `valued at $${totalValue.toFixed(2)}`;
  }

  // Placeholder data for template
  const placeholderData = {
    donorName: donorName,
    bookCount: numberOfBooks,
    donationDate: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    donationType: donationType,
    valuePerBook: valuePerBook ? `$${valuePerBook}` : '',
    totalValue: totalValue ? `$${totalValue.toFixed(2)}` : '',
    valueDescription: valueDescription,
    isOrganization: isOrganization || false
  };

  // Fallback template (hardcoded) - matches the official Tree House Books format
  const fallbackTemplate = {
    subject: 'Thank you for supporting Tree House Books!',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c5f2d; margin: 0;">Thank You!</h1>
        </div>

        <p style="font-size: 16px;">Dear {{donorName}},</p>

        <p style="font-size: 16px;">
          Thank you so much for supporting Tree House Books and our Books in Every Home campaign
          with your donation of <strong>{{bookCount}} books</strong> {{valueDescription}}.
        </p>

        <p style="font-size: 16px;">
          Without you we truly could not fulfill our goal of creating and sustaining a community of readers,
          writers, and thinkers. The books that you have so generously donated will find their way into the
          homes of families and children, changing lives through reading and mitigating the Philadelphia
          literacy crisis.
        </p>

        <p style="font-size: 16px;">
          It is our hope that you continue to walk with us to promote lifelong readership and access to
          high-quality books for every child. We have many ways that you can continue to stay involved
          with Tree House Books: volunteer, serve on a committee, or become a donor!
        </p>

        <p style="font-size: 16px;">
          Thanks again, {{donorName}}! We hope to hear from you again soon. As always, do not hesitate
          to reach out to <a href="mailto:emma@treehousebooks.org">emma@treehousebooks.org</a>.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

        <p style="color: #666; font-size: 13px; text-align: center;">
          <strong>Tree House Books</strong><br>
          Building community through books
        </p>
      </div>
    `,
    textBody: `Dear {{donorName}},

Thank you so much for supporting Tree House Books and our Books in Every Home campaign with your donation of {{bookCount}} books {{valueDescription}}.

Without you we truly could not fulfill our goal of creating and sustaining a community of readers, writers, and thinkers. The books that you have so generously donated will find their way into the homes of families and children, changing lives through reading and mitigating the Philadelphia literacy crisis.

It is our hope that you continue to walk with us to promote lifelong readership and access to high-quality books for every child. We have many ways that you can continue to stay involved with Tree House Books: volunteer, serve on a committee, or become a donor!

Thanks again, {{donorName}}! We hope to hear from you again soon. As always, do not hesitate to reach out to emma@treehousebooks.org.

---
Tree House Books
Building community through books
    `
  };

  return sendTemplatedEmail(
    'donation_thank_you',
    email,
    placeholderData,
    { donationId, firstName, numberOfBooks },
    fallbackTemplate
  );
}

// ─── Get Email Logs ─────────────────────────────────────────────────────────
/**
 * Get recent email logs for admin review
 * @param {object} options - Query options
 * @param {number} options.limit - Max records to return (default 100)
 * @param {string} options.status - Filter by status ('sent', 'failed', 'skipped')
 * @param {string} options.templateKey - Filter by template
 * @returns {Promise<Array>} - Array of email log records
 */
async function getEmailLogs(options = {}) {
  const { limit = 100, status, templateKey } = options;

  const query = {};
  if (status) query.status = status;
  if (templateKey) query.templateKey = templateKey;

  return EmailLog.find(query)
    .sort({ sentAt: -1 })
    .limit(limit)
    .lean();
}

// ─── Seed Default Templates ─────────────────────────────────────────────────
/**
 * Seed default email templates to database
 * Called on server startup or manually by admin
 */
async function seedEmailTemplates() {
  try {
    const EmailTemplate = require('../models/EmailTemplate');
    await EmailTemplate.seedDefaults();
    return { success: true };
  } catch (err) {
    console.error('Failed to seed email templates:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Export Functions ────────────────────────────────────────────────────────

module.exports = {
  sendPasswordResetEmail,
  sendCheckoutThankYouEmail,
  sendDonationThankYouEmail,
  sendTemplatedEmail,
  getEmailLogs,
  seedEmailTemplates,
  EmailLog
};

// ─── Test Function (uncomment to test email configuration) ───────────────────
/*
// Run with: node services/mailer.js
if (require.main === module) {
  require('dotenv').config();

  console.log('Testing email configuration...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Not set');
  console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Not set');

  sendPasswordResetEmail(
    'test@example.com',
    'test-token-123',
    'Test User'
  )
  .then(() => console.log('✅ Test email sent successfully!'))
  .catch(err => console.error('❌ Test failed:', err.message));
}
*/
