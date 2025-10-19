/**
 * Route Debugging Middleware
 * Logs all registered routes on server startup
 */

// Simple console logger fallback
const logger = {
  info: (msg) => console.log(msg),
  warn: (msg) => console.warn(msg),
  error: (msg) => console.error(msg)
};

/**
 * Extract routes from Express app
 */
function listRoutes(app) {
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase());
      routes.push({
        method: methods.join('|'),
        path: middleware.route.path
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase());
          routes.push({
            method: methods.join('|'),
            path: handler.route.path
          });
        }
      });
    }
  });

  return routes;
}

/**
 * Log all registered routes in a readable format
 */
function logRoutes(app) {
  const routes = listRoutes(app);

  logger.info('═══════════════════════════════════════════════');
  logger.info('REGISTERED ROUTES');
  logger.info('═══════════════════════════════════════════════');

  // Group by path prefix
  const grouped = {};
  routes.forEach(route => {
    const prefix = route.path.split('/')[1] || 'root';
    if (!grouped[prefix]) grouped[prefix] = [];
    grouped[prefix].push(route);
  });

  Object.keys(grouped).sort().forEach(prefix => {
    logger.info(`\n[${prefix.toUpperCase()}]`);
    grouped[prefix].forEach(route => {
      logger.info(`  ${route.method.padEnd(6)} ${route.path}`);
    });
  });

  logger.info('\n═══════════════════════════════════════════════');
  logger.info(`Total Routes: ${routes.length}`);
  logger.info('═══════════════════════════════════════════════\n');
}

/**
 * Middleware to log incoming requests
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? 'ERROR' : 'INFO';

    logger.info(`[${statusColor}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);

    // Log 404s with extra detail
    if (res.statusCode === 404) {
      logger.warn(`404 NOT FOUND: ${req.method} ${req.originalUrl}`);
      logger.warn(`  → User Agent: ${req.get('user-agent')}`);
      logger.warn(`  → Referrer: ${req.get('referrer') || 'none'}`);
    }
  });

  next();
}

module.exports = {
  listRoutes,
  logRoutes,
  requestLogger
};
