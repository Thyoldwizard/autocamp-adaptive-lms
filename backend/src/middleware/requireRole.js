const { UnauthorizedError, ForbiddenError } = require('../lib/errors');

// Factory — returns middleware that enforces a single allowed role.
// Must run after auth.js (depends on req.user being set).
//
// Usage: router.use(requireRole('instructor'))
module.exports = function requireRole(role) {
  return function checkRole(req, _res, next) {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (req.user.role !== role) {
      return next(new ForbiddenError(`Requires role: ${role}`));
    }

    next();
  };
};
