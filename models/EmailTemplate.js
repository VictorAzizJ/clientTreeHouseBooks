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

  // Human-readable trigger event description (e.g., "When someone donates books")
  triggerEvent: {
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
    // ─── DONATION THANK YOU ─────────────────────────────────────────────────────
    {
      templateKey: 'donation_thank_you',
      name: 'Donation Thank You',
      description: 'Sent automatically when a book donation is recorded',
      triggerEvent: 'When someone donates books',
      subject: 'Thank you for supporting Tree House Books!',
      htmlBody: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { padding: 20px; }
    .signature { margin-top: 30px; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>Dear {{donorName}},</p>

      <p>Thank you so much for supporting Tree House Books and our Books in Every Home campaign with your donation of {{bookCount}} books {{valueDescription}}.</p>

      <p>Without you we truly could not fulfill our goal of creating and sustaining a community of readers, writers, and thinkers. The books that you have so generously donated will find their way into the homes of families and children, changing lives through reading and mitigating the Philadelphia literacy crisis.</p>

      <p>It is our hope that you continue to walk with us to promote lifelong readership and access to high-quality books for every child. We have many ways that you can continue to stay involved with Tree House Books: volunteer, serve on a committee, or become a donor!</p>

      <p>Thanks again, {{donorName}}! We hope to hear from you again soon. As always, do not hesitate to reach out to <a href="mailto:emma@treehousebooks.org">emma@treehousebooks.org</a> with any questions!</p>

      <div class="signature">
        <p>Best,<br>
        <strong>Emma Goldstein</strong><br>
        Giving Library Manager<br>
        Tree House Books<br>
        1430 W. Susquehanna Avenue<br>
        Philadelphia, PA 19121<br>
        (215) 236-1760 - office<br>
        <a href="https://www.treehousebooks.org">Tree House Books Online</a><br>
        <em>Growing and sustaining a community of readers, writers, and thinkers</em></p>
      </div>

      <div class="footer">
        <p>Tree House Books is a 501(c)(3) charitable organization, and your gift is fully tax-deductible. No services were provided or benefits received for this contribution.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
      textBody: `Dear {{donorName}},

Thank you so much for supporting Tree House Books and our Books in Every Home campaign with your donation of {{bookCount}} books {{valueDescription}}.

Without you we truly could not fulfill our goal of creating and sustaining a community of readers, writers, and thinkers. The books that you have so generously donated will find their way into the homes of families and children, changing lives through reading and mitigating the Philadelphia literacy crisis.

It is our hope that you continue to walk with us to promote lifelong readership and access to high-quality books for every child. We have many ways that you can continue to stay involved with Tree House Books: volunteer, serve on a committee, or become a donor!

Thanks again, {{donorName}}! We hope to hear from you again soon. As always, do not hesitate to reach out to emma@treehousebooks.org with any questions!

Best,
Emma Goldstein
Giving Library Manager
Tree House Books
1430 W. Susquehanna Avenue
Philadelphia, PA 19121
(215) 236-1760 - office
Tree House Books Online
Growing and sustaining a community of readers, writers, and thinkers

Tree House Books is a 501(c)(3) charitable organization, and your gift is fully tax-deductible. No services were provided or benefits received for this contribution.`,
      availablePlaceholders: [
        { placeholder: '{{donorName}}', description: 'Full name of the donor or organization name' },
        { placeholder: '{{bookCount}}', description: 'Total number of books donated' },
        { placeholder: '{{valueDescription}}', description: 'Value description (e.g., "that you valued $1 per book" for used, or "Valued at $50.00" for new)' },
        { placeholder: '{{donationDate}}', description: 'Date the donation was made' }
      ],
      isActive: true
    },

    // ─── WELCOME NEW MEMBER ─────────────────────────────────────────────────────
    {
      templateKey: 'welcome_member',
      name: 'Welcome New Member',
      description: 'Sent to new members when they sign up',
      triggerEvent: 'When a new member registers',
      subject: 'Welcome to TreeHouse Books, {{memberName}}!',
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
        { placeholder: '{{memberName}}', description: 'Full name of the new member' },
        { placeholder: '{{memberEmail}}', description: 'Email address of the member' },
        { placeholder: '{{joinDate}}', description: 'Date they became a member' }
      ],
      isActive: false
    },

    // ─── VISITOR CHECK-IN CONFIRMATION ──────────────────────────────────────────
    {
      templateKey: 'visitor_checkin',
      name: 'Visitor Check-In Confirmation',
      description: 'Sent when a visitor checks in at TreeHouse Books',
      triggerEvent: 'When someone checks in as a visitor',
      subject: 'Thanks for visiting TreeHouse Books!',
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
      <h1>Thanks for Visiting!</h1>
    </div>
    <div class="content">
      <p>Hi <span class="highlight">{{visitorName}}</span>,</p>

      <p>Thank you for visiting TreeHouse Books today! We hope you had a great experience.</p>

      <p><strong>Visit Details:</strong></p>
      <ul>
        <li>Date: {{visitDate}}</li>
        <li>Time: {{visitTime}}</li>
      </ul>

      <p>We'd love to see you again soon! Check out our programs and events.</p>

      <p>Best,<br>
      <strong>The TreeHouse Books Team</strong></p>
    </div>
    <div class="footer">
      <p>TreeHouse Books | Spreading the joy of reading</p>
    </div>
  </div>
</body>
</html>`,
      textBody: `Hi {{visitorName}},

Thank you for visiting TreeHouse Books today! We hope you had a great experience.

Visit Details:
- Date: {{visitDate}}
- Time: {{visitTime}}

We'd love to see you again soon! Check out our programs and events.

Best,
The TreeHouse Books Team`,
      availablePlaceholders: [
        { placeholder: '{{visitorName}}', description: 'Name of the visitor' },
        { placeholder: '{{visitDate}}', description: 'Date of the visit' },
        { placeholder: '{{visitTime}}', description: 'Time of check-in' }
      ],
      isActive: false
    },

    // ─── BOOK CHECKOUT RECEIPT ──────────────────────────────────────────────────
    {
      templateKey: 'checkout_receipt',
      name: 'Book Checkout Receipt',
      description: 'Sent when a member checks out books',
      triggerEvent: 'When books are checked out to a member',
      subject: 'Your TreeHouse Books Checkout - {{bookCount}} book(s)',
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
    .book-list { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Checkout Receipt</h1>
    </div>
    <div class="content">
      <p>Hi <span class="highlight">{{memberName}}</span>,</p>

      <p>Here's a summary of your book checkout today.</p>

      <div class="book-list">
        <p><strong>Checkout Details:</strong></p>
        <ul>
          <li>Date: {{checkoutDate}}</li>
          <li>Number of Books: {{bookCount}}</li>
          <li>Categories: {{categories}}</li>
        </ul>
      </div>

      <p>Enjoy your reading! There are no due dates at TreeHouse Books - keep the books as long as you'd like, or return them when you're done so others can enjoy them too.</p>

      <p>Happy reading,<br>
      <strong>The TreeHouse Books Team</strong></p>
    </div>
    <div class="footer">
      <p>TreeHouse Books | Spreading the joy of reading</p>
    </div>
  </div>
</body>
</html>`,
      textBody: `Hi {{memberName}},

Here's a summary of your book checkout today.

Checkout Details:
- Date: {{checkoutDate}}
- Number of Books: {{bookCount}}
- Categories: {{categories}}

Enjoy your reading! There are no due dates at TreeHouse Books - keep the books as long as you'd like, or return them when you're done so others can enjoy them too.

Happy reading,
The TreeHouse Books Team`,
      availablePlaceholders: [
        { placeholder: '{{memberName}}', description: 'Name of the member checking out' },
        { placeholder: '{{bookCount}}', description: 'Total number of books checked out' },
        { placeholder: '{{checkoutDate}}', description: 'Date of the checkout' },
        { placeholder: '{{categories}}', description: 'Book categories checked out' }
      ],
      isActive: false
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
