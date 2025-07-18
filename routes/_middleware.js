/**
 * Only staff or admin allowed.
 */
function ensureStaffOrAdmin(req, res, next) {
  const role = req.session.user?.role;
  if (role === 'staff' || role === 'admin') return next();
  return res.status(403).send('Forbidden');
}

/**
 * Only admin allowed.
 */
function ensureAdmin(req, res, next) {
  const role = req.session.user?.role;
  if (role === 'admin') return next();
  return res.status(403).send('Forbidden');
}

module.exports = {
  ensureStaffOrAdmin,
  ensureAdmin
};