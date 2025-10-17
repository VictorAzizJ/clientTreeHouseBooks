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

// ─── Send Donation Thank You Email ──────────────────────────────────────────
/**
 * Send a thank-you email after book donation
 *
 * @param {string} email - Member email address
 * @param {string} firstName - Member's first name
 * @param {object} details - Donation details
 * @param {number} details.numberOfBooks - Number of books donated
 * @param {string[]} details.genres - Array of genres (optional)
 * @param {number} details.weight - Total weight in lbs (optional)
 * @returns {Promise<void>}
 */
async function sendDonationThankYouEmail(email, firstName, details) {
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
    subject: 'Thank You for Your Generous Donation!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c5f2d; margin: 0;">💚 Thank You for Your Generosity!</h1>
        </div>

        <p style="font-size: 16px;">Hi ${firstName},</p>

        <p style="font-size: 16px;">
          Thank you so much for your generous donation to TreeHouse Books!
          Your contribution helps us continue our mission of building community through books.
        </p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c5f2d; margin-top: 0;">Your Donation Summary:</h3>
          <ul style="font-size: 15px; line-height: 1.8;">
            <li><strong>Books donated:</strong> ${numberOfBooks}</li>
            ${genres && genres.length > 0 ? `<li><strong>Genres:</strong> ${genreList}</li>` : ''}
            ${weight ? `<li><strong>Weight:</strong> ${weight} lbs</li>` : ''}
          </ul>
        </div>

        <p style="font-size: 16px;">
          Your donated books will find new homes with readers in our community who will
          treasure them. Thank you for helping us spread the joy of reading!
        </p>

        <p style="font-size: 16px;">
          We deeply appreciate your support and generosity.
          Together, we're making a difference one book at a time.
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

Thank you so much for your generous donation to TreeHouse Books!
Your contribution helps us continue our mission of building community through books.

Your Donation Summary:
- Books donated: ${numberOfBooks}
${genres && genres.length > 0 ? `- Genres: ${genreList}` : ''}
${weight ? `- Weight: ${weight} lbs` : ''}

Your donated books will find new homes with readers in our community who will
treasure them. Thank you for helping us spread the joy of reading!

We deeply appreciate your support and generosity.
Together, we're making a difference one book at a time.

---
TreeHouse Books
Building community through books
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Donation thank-you email sent to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending donation thank-you email:', error);
    // Don't throw - thank-you emails are non-critical
  }
}

// ─── Export Functions ────────────────────────────────────────────────────────

module.exports = {
  sendPasswordResetEmail,
  sendCheckoutThankYouEmail,
  sendDonationThankYouEmail
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
