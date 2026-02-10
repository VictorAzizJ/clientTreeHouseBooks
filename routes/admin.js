// routes/admin.js
const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const User    = require('../models/User');
const EmailTemplate = require('../models/EmailTemplate');
const { sendPasswordResetEmail, getEmailLogs, seedEmailTemplates } = require('../services/mailer');

// Middleware to ensure only admins can hit these routes
function ensureAdmin(req, res, next) {
  if (req.session?.user?.role === 'admin') {
    return next();
  }
  return res.status(403).send("Forbidden: You are not an admin");
}

// Middleware to allow staff OR admin access
function ensureStaffOrAdmin(req, res, next) {
  const role = req.session?.user?.role;
  if (role === 'admin' || role === 'staff') {
    return next();
  }
  return res.status(403).send("Forbidden: Staff or admin access required");
}

// GET /admin — admin dashboard (redirect to users for now)
router.get('/admin', ensureAdmin, (req, res) => {
  res.redirect('/admin/users');
});

// GET /admin/users — list everyone
router.get('/admin/users', ensureAdmin, async (req, res, next) => {
  try {
    const users   = await User.find().lean();
    const success = req.session.success;
    delete req.session.success;
    res.render('adminUsers', {
      currentUser: req.session.user,
      user: req.session.user,
      users,
      success
    });
  } catch (err) {
    next(err);
  }
});

// POST /admin/users/:id — change one user’s role
router.post('/admin/users/:id', ensureAdmin, async (req, res, next) => {
  try {
    const userId  = req.params.id;
    const newRole = req.body.role; // "volunteer", "staff", or "admin"

    // 1) Update in the database
    const updated = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true, lean: true }
    );
    if (!updated) {
      req.session.success = 'User not found';
      return res.redirect('/admin/users');
    }

    // 2) If *you* changed *your own* role, sync your session immediately
    const meId = req.session.user._id.toString();
    if (meId === updated._id.toString()) {
      req.session.user.role = updated.role;
      // Flash a quick message and send you to your dashboard
      req.session.success = 'Your role has been updated—enjoy your new dashboard!';
      return res.redirect('/dashboard');
    }

    // 3) Otherwise, flash and go back to Manage Users
    req.session.success = `${updated.email || updated.firstName} is now a ${updated.role}`;
    res.redirect('/admin/users');

  } catch (err) {
    next(err);
  }
});

// ─── POST /admin/users/:id/reset-password ────────────────────────────────────
// Admin-initiated password reset: generates reset token and sends email to user
//
// FLOW:
// 1. Admin clicks "Reset Password" button on adminUsers page
// 2. Server generates reset token (same as forgot-password flow)
// 3. Server sends password reset email to the user
// 4. User clicks link in email and follows normal reset-password flow
//
// NOTE: This does NOT set a temporary password - it uses the same secure
// email-based reset flow that users can self-initiate via /forgot-password
router.post('/admin/users/:id/reset-password', ensureAdmin, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // 1. Find the user
    const user = await User.findById(userId);
    if (!user) {
      req.session.success = 'User not found';
      return res.redirect('/admin/users');
    }

    // 2. Generate reset token (same as forgot-password)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // 3. Save token to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = tokenExpiry;
    await user.save();

    // 4. Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.firstName);
      req.session.success = `Password reset email sent to ${user.email}`;
      console.log(`✅ Admin-initiated password reset for: ${user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      // Clear token if email fails
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();

      req.session.success = 'Failed to send reset email. Please ensure email is configured.';
    }

    res.redirect('/admin/users');

  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

// GET /admin/email-templates - List all email templates (staff and admin can access)
router.get('/admin/email-templates', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const templates = await EmailTemplate.getAllTemplates();

    // Get flash messages
    const success = req.session.success;
    const error = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('adminEmailTemplates', {
      user: req.session.user,
      templates,
      success,
      error
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/email-templates/seed - Seed default templates (admin only for safety)
router.get('/admin/email-templates/seed', ensureStaffOrAdmin, async (req, res) => {
  const result = await seedEmailTemplates();

  if (result.success) {
    req.session.success = 'Default email templates seeded successfully';
  } else {
    req.session.error = `Failed to seed templates: ${result.error}`;
  }

  res.redirect('/admin/email-templates');
});

// GET /admin/email-templates/:id/edit - Edit template form (staff and admin can access)
router.get('/admin/email-templates/:id/edit', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const template = await EmailTemplate.findById(req.params.id).lean();

    if (!template) {
      req.session.error = 'Template not found';
      return res.redirect('/admin/email-templates');
    }

    // Get flash messages
    const error = req.session.error;
    delete req.session.error;

    res.render('adminEmailTemplateEdit', {
      user: req.session.user,
      template,
      error
    });
  } catch (err) {
    next(err);
  }
});

// POST /admin/email-templates/:id - Update template (staff and admin can access)
router.post('/admin/email-templates/:id', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const { name, subject, htmlBody, textBody, isActive } = req.body;

    const template = await EmailTemplate.findById(req.params.id);

    if (!template) {
      req.session.error = 'Template not found';
      return res.redirect('/admin/email-templates');
    }

    // Update fields
    template.name = name;
    template.subject = subject;
    template.htmlBody = htmlBody;
    template.textBody = textBody || '';
    template.isActive = isActive === 'true' || isActive === true;
    template.lastModifiedBy = req.session.user._id;

    await template.save();

    req.session.success = `"${template.name}" template updated successfully`;
    res.redirect('/admin/email-templates');
  } catch (err) {
    next(err);
  }
});

// POST /admin/email-templates/:id/toggle - Toggle template active status (staff and admin)
router.post('/admin/email-templates/:id/toggle', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);

    if (!template) {
      req.session.error = 'Template not found';
      return res.redirect('/admin/email-templates');
    }

    template.isActive = !template.isActive;
    template.lastModifiedBy = req.session.user._id;
    await template.save();

    const status = template.isActive ? 'enabled' : 'disabled';
    req.session.success = `"${template.name}" has been ${status}`;
    res.redirect('/admin/email-templates');
  } catch (err) {
    next(err);
  }
});

// GET /admin/email-logs - View email send logs (staff and admin can access)
router.get('/admin/email-logs', ensureStaffOrAdmin, async (req, res, next) => {
  try {
    const { status, templateKey, limit } = req.query;

    const logs = await getEmailLogs({
      status,
      templateKey,
      limit: parseInt(limit) || 100
    });

    // Get unique template keys for filter dropdown
    const templates = await EmailTemplate.getAllTemplates();

    res.render('adminEmailLogs', {
      user: req.session.user,
      logs,
      templates,
      filters: { status, templateKey, limit }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


