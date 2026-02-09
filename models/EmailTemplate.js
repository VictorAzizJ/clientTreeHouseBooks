// models/EmailTemplate.js
// ═══════════════════════════════════════════════════════════════════════════════
// Email Template Model
// Stores admin-editable email templates for various triggers (donations, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  // Template identifier (e.g., 'donation_thank_you', 'welcome_member')
  templateKey: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },

  // Human-readable name for admin display
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Description of when this template is used
  description: {
    type: String,
    trim: true
  },

  // Email subject line (supports placeholders like {{donorName}})
  subject: {
    type: String,
    required: true,
    trim: true
  },

  // HTML body content (supports placeholders)
  htmlBody: {
    type: String,
    required: true
  },

  // Plain text body (fallback for email clients that don't support HTML)
  textBody: {
    type: String
  },

  // Whether this template is active (can be disabled without deleting)
  isActive: {
    type: Boolean,
    default: true
  },

  // Available placeholder variables for this template
  availablePlaceholders: [{
    placeholder: String,  // e.g., '{{donorName}}'
    description: String   // e.g., 'Name of the donor'
  }],

  // Last modified by
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Static method to get template by key
emailTemplateSchema.statics.getByKey = async function(templateKey) {
  return this.findOne({ templateKey, isActive: true });
};

// Static method to get all templates
emailTemplateSchema.statics.getAllTemplates = async function() {
  return this.find().sort({ name: 1 });
};

// Static method to seed default templates
emailTemplateSchema.statics.seedDefaults = async function() {
  const defaults = [
    {
      templateKey: 'donation_thank_you',
      name: 'Donation Thank You',
      description: 'Sent automatically when a book donation is recorded',
      subject: 'Thank you for your book donation to TreeHouse Books!',
      htmlBody: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2d5a27; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .highlight { color: #2d5a27; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You!</h1>
    </div>
    <div class="content">
      <p>Dear <span class="highlight">{{donorName}}</span>,</p>

      <p>Thank you so much for your generous donation of <span class="highlight">{{bookCount}} book(s)</span> to TreeHouse Books!</p>

      <p>Your contribution helps us continue our mission of promoting literacy and putting books into the hands of children and families in our community.</p>

      <p><strong>Donation Details:</strong></p>
      <ul>
        <li>Date: {{donationDate}}</li>
        <li>Books Donated: {{bookCount}}</li>
        {{#if notes}}<li>Notes: {{notes}}</li>{{/if}}
      </ul>

      <p>Every book you donate makes a difference. Thank you for being part of our TreeHouse Books family!</p>

      <p>With gratitude,<br>
      <strong>The TreeHouse Books Team</strong></p>
    </div>
    <div class="footer">
      <p>TreeHouse Books | Spreading the joy of reading</p>
    </div>
  </div>
</body>
</html>`,
      textBody: `Dear {{donorName}},

Thank you so much for your generous donation of {{bookCount}} book(s) to TreeHouse Books!

Your contribution helps us continue our mission of promoting literacy and putting books into the hands of children and families in our community.

Donation Details:
- Date: {{donationDate}}
- Books Donated: {{bookCount}}

Every book you donate makes a difference. Thank you for being part of our TreeHouse Books family!

With gratitude,
The TreeHouse Books Team`,
      availablePlaceholders: [
        { placeholder: '{{donorName}}', description: 'Name of the donor' },
        { placeholder: '{{bookCount}}', description: 'Number of books donated' },
        { placeholder: '{{donationDate}}', description: 'Date of the donation' },
        { placeholder: '{{notes}}', description: 'Any notes about the donation' }
      ],
      isActive: true
    },
    {
      templateKey: 'welcome_member',
      name: 'Welcome New Member',
      description: 'Sent to new members when they register (optional)',
      subject: 'Welcome to TreeHouse Books!',
      htmlBody: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2d5a27; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .highlight { color: #2d5a27; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to TreeHouse Books!</h1>
    </div>
    <div class="content">
      <p>Dear <span class="highlight">{{memberName}}</span>,</p>

      <p>Welcome to the TreeHouse Books family! We're thrilled to have you join our community of book lovers.</p>

      <p>As a member, you can:</p>
      <ul>
        <li>Check out books from our collection</li>
        <li>Participate in our reading programs</li>
        <li>Attend special events and activities</li>
      </ul>

      <p>We look forward to seeing you at TreeHouse Books!</p>

      <p>Happy reading,<br>
      <strong>The TreeHouse Books Team</strong></p>
    </div>
    <div class="footer">
      <p>TreeHouse Books | Spreading the joy of reading</p>
    </div>
  </div>
</body>
</html>`,
      textBody: `Dear {{memberName}},

Welcome to the TreeHouse Books family! We're thrilled to have you join our community of book lovers.

As a member, you can:
- Check out books from our collection
- Participate in our reading programs
- Attend special events and activities

We look forward to seeing you at TreeHouse Books!

Happy reading,
The TreeHouse Books Team`,
      availablePlaceholders: [
        { placeholder: '{{memberName}}', description: 'Name of the new member' },
        { placeholder: '{{memberEmail}}', description: 'Email of the new member' }
      ],
      isActive: false // Disabled by default, admin can enable
    }
  ];

  for (const template of defaults) {
    await this.findOneAndUpdate(
      { templateKey: template.templateKey },
      template,
      { upsert: true, new: true }
    );
  }

  console.log('Email templates seeded successfully');
};

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
