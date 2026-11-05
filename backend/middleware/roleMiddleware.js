import AppError from '../utility/AppError.js';

/**
 * RoleMiddleware — authorization guards for role-restricted routes.
 *
 * OOP concepts:
 * - Factory method requireRole(...roles) returns a configured middleware
 *   (closed-over allowed roles = encapsulated policy).
 * - Static requireAdmin is a preconfigured instance of that factory.
 *
 * Role always comes from the server-side session (req.user), never from
 * client-supplied body/query headers. Drivers cannot reach Admin APIs.
 */
export default class RoleMiddleware {
  /**
   * Build a middleware that allows only the given roles.
   * @param {...('ADMIN'|'DRIVER')} allowedRoles
   * @returns {import('express').RequestHandler}
   */
  static requireRole(...allowedRoles) {
    return function roleGuard(req, _res, next) {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }
      if (!allowedRoles.includes(req.user.role)) {
        return next(
          new AppError('You do not have permission to perform this action', 403),
        );
      }
      return next();
    };
  }

  /** Admin-only guard (preconfigured factory result). */
  static requireAdmin = RoleMiddleware.requireRole('ADMIN');
}
