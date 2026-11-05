import TokenService from '../utility/tokenService.js';
import User from '../models/User.js';
import AppError from '../utility/AppError.js';
import catchAsync from '../utility/catchAsync.js';

/**
 * AuthMiddleware — authenticates Bearer JWTs on protected routes.
 *
 * OOP concepts:
 * - Static middleware factory / class methods (stateless request guards).
 * - Encapsulation: token parse → verify → load user → status/version check.
 *
 * Never trusts role claims alone for authorization decisions without
 * re-reading the user from the database.
 */
export default class AuthMiddleware {
  /**
   * Express middleware: requires a valid, non-revoked, active session.
   * Attaches { id, role, username, tokenVersion } to req.user.
   */
  static authenticate = catchAsync(async (req, _res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      throw new AppError('Authentication token is required', 401);
    }

    const token = header.slice(7).trim();
    if (!token) {
      throw new AppError('Authentication token is required', 401);
    }

    let payload;
    try {
      payload = TokenService.verify(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Session expired. Please sign in again.', 401);
      }
      throw new AppError('Invalid authentication token', 401);
    }

    const UserModel = User.getModel();
    const user = await UserModel.findById(payload.sub).select('+tokenVersion');
    if (!user) {
      throw new AppError('Invalid authentication token', 401);
    }
    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is inactive', 403);
    }
    if (!user.isTokenVersionValid(payload.tokenVersion)) {
      throw new AppError('Session is no longer valid', 401);
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      username: user.username,
      tokenVersion: payload.tokenVersion,
    };
    next();
  });
}
