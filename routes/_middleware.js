// routes/_middleware.js

/**
 * Only allow access if someone is logged in AND is staff or admin.
 */
function ensureAuthenticated(req, res, next) {
  const user = req.session?.user;
  if (user && ['staff','admin'].includes(user.role)) {
    return next();
  }
  // redirect to your login page (or show 403)
  return res.redirect('/custom-login');
}

module.exports = {
  ensureAuthenticated
};
