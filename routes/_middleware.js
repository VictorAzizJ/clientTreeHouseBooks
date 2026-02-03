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

/**
 * Front Desk Mode Route Whitelist
 * When front desk mode is active, only these routes are allowed.
 */
const FRONT_DESK_ALLOWED_ROUTES = [
  // Dashboard and front desk routes
  '/dashboard',
  '/front-desk',
  '/front-desk/enter',
  '/front-desk/exit',
  '/logout',

  // Visitor check-in
  '/visitor-checkin',
  '/visits',

  // Members (view and create only)
  '/members',
  '/members/new',
  '/api/members/search',

  // Checkouts (view and create only)
  '/checkouts',
  '/checkouts/new',

  // Donations (view and create only)
  '/donations',
  '/donations/new',

  // Organizations (view and create only)
  '/organizations',
  '/organizations/new',

  // Static assets and health check
  '/css',
  '/js',
  '/images',
  '/healthz',
  '/favicon.ico'
];

/**
 * Check if a route is allowed in front desk mode.
 * Handles exact matches and prefix matches for nested routes.
 */
function isRouteAllowedInFrontDesk(path) {
  // Normalize path (remove trailing slash, handle query strings)
  const normalizedPath = path.split('?')[0].replace(/\/$/, '') || '/';

  for (const allowed of FRONT_DESK_ALLOWED_ROUTES) {
    // Exact match
    if (normalizedPath === allowed) return true;

    // Prefix match for nested routes (e.g., /members/123 matches /members)
    if (normalizedPath.startsWith(allowed + '/')) {
      // Special case: block edit/delete routes in front desk mode
      if (normalizedPath.includes('/edit') || normalizedPath.includes('/delete')) {
        return false;
      }
      return true;
    }
  }

  return false;
}

/**
 * Middleware: Restrict access when front desk mode is active.
 * Staff/admin users in front desk mode can only access whitelisted routes.
 */
function ensureFrontDeskAllowed(req, res, next) {
  // Skip if not logged in or front desk mode not active
  if (!req.session?.user || !req.session.frontDeskMode) {
    return next();
  }

  // Check if route is allowed
  if (isRouteAllowedInFrontDesk(req.path)) {
    return next();
  }

  // Route not allowed - redirect to dashboard with message
  req.session.error = 'This feature is not available in Front Desk Mode. Exit front desk mode to access all features.';
  return res.redirect('/dashboard');
}

module.exports = {
  ensureStaffOrAdmin,
  ensureAdmin,
  ensureFrontDeskAllowed,
  FRONT_DESK_ALLOWED_ROUTES
};