import BaseService from './BaseService.js';
import User from '../models/User.js';
import AppError from '../utility/AppError.js';
import TokenService from '../utility/tokenService.js';
import AuthValidator from '../api/authValidation.js';

/**
 * AuthService — service layer for authentication & user management.
 *
 * Layering (clean architecture):
 *   routes → controller (HTTP) → service (business rules) → model (data)
 *
 * OOP concepts:
 * - Inheritance: extends BaseService for shared helpers.
 * - Encapsulation: controllers stay thin; this class owns all rules.
 * - Single Responsibility: only auth/user-account use-cases live here.
 *
 * Session invalidation:
 * - logout / deactivate / password reset bump user.tokenVersion
 * - outstanding JWTs then fail authMiddleware verification
 */
export default class AuthService extends BaseService {
  /**
   * Validate credentials, check status, issue JWT.
   * @returns {Promise<{ token: string, user: object }>}
   */
  static async login({ username, password }) {
    AuthValidator.assert(AuthValidator.validateLogin({ username, password }));

    const UserModel = User.getModel();
    const user = await UserModel.findOne({
      username: AuthService.normalizeUsername(username),
    }).select('+password +tokenVersion');

    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid username or password', 401);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is inactive. Contact your administrator.', 403);
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = TokenService.sign(user);

    return {
      token,
      user: User.toSafeUser(user),
    };
  }

  /**
   * Admin-only: create a DRIVER login tied to a driver record.
   * @returns {Promise<object>} safe user
   */
  static async createDriver({ username, password, driverId }) {
    AuthValidator.assert(
      AuthValidator.validateCreateDriver({ username, password, driverId }),
    );

    const UserModel = User.getModel();
    const normalized = AuthService.normalizeUsername(username);

    const existing = await UserModel.findOne({ username: normalized });
    if (existing) {
      throw new AppError('Username already exists', 409);
    }

    const user = await UserModel.create({
      username: normalized,
      password,
      role: 'DRIVER',
      driverId,
      status: 'ACTIVE',
    });

    return User.toSafeUser(user);
  }

  /**
   * Admin-only: list every driver login account with its linked
   * driver record — used by the admin app to show which drivers
   * already have credentials.
   * @returns {Promise<object[]>} safe user summaries
   */
  static async listDriverAccounts() {
    const UserModel = User.getModel();
    const users = await UserModel.find({ role: 'DRIVER' })
      .populate({ path: 'driverId', select: 'name employeeId status' })
      .sort({ username: 1 })
      .lean();

    return users.map(u => ({
      _id: u._id,
      username: u.username,
      status: u.status,
      lastLogin: u.lastLogin || null,
      driverId: u.driverId?._id || u.driverId || null,
      driver: u.driverId && u.driverId.name ? u.driverId : null,
      createdAt: u.createdAt,
    }));
  }

  /**
   * Admin-only: reset a driver password and revoke existing sessions.
   * @returns {Promise<object>} safe user
   */
  static async resetPassword(userId, { password }) {
    AuthValidator.assert(AuthValidator.validateResetPassword({ password }));

    const UserModel = User.getModel();
    const user = await UserModel.findById(userId).select('+tokenVersion');
    if (!user) {
      throw new AppError('User not found', 404);
    }
    if (user.role !== 'DRIVER') {
      throw new AppError('Only driver accounts can be reset', 400);
    }

    user.password = password;
    user.tokenVersion = AuthService.nextTokenVersion(user.tokenVersion);
    await user.save();

    return User.toSafeUser(user);
  }

  /**
   * Admin-only: activate or deactivate a driver account.
   * Deactivation also bumps tokenVersion (kills live tokens).
   * @returns {Promise<object>} safe user
   */
  static async setStatus(userId, body) {
    AuthValidator.assert(AuthValidator.validateStatus(body));
    const { status } = body;

    const UserModel = User.getModel();
    const user = await UserModel.findById(userId).select('+tokenVersion');
    if (!user) {
      throw new AppError('User not found', 404);
    }
    if (user.role !== 'DRIVER') {
      throw new AppError(
        'Only driver accounts can be activated or deactivated',
        400,
      );
    }

    const wasActive = user.status === 'ACTIVE';
    user.status = status;

    if (wasActive && status === 'INACTIVE') {
      user.tokenVersion = AuthService.nextTokenVersion(user.tokenVersion);
    }

    await user.save({ validateBeforeSave: false });
    return User.toSafeUser(user);
  }

  /**
   * Load the authenticated user and re-check status + tokenVersion.
   * @returns {Promise<object>} safe user
   */
  static async getMe(userId, tokenVersion) {
    const UserModel = User.getModel();
    const user = await UserModel.findById(userId).select('+tokenVersion');
    if (!user) {
      throw new AppError('User not found', 401);
    }
    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is inactive', 403);
    }
    if (!user.isTokenVersionValid(tokenVersion)) {
      throw new AppError('Session is no longer valid', 401);
    }
    return User.toSafeUser(user);
  }

  /**
   * Invalidate every outstanding token for this user.
   * Deleting the mobile token alone would NOT kill a copied JWT.
   * @returns {Promise<{ invalidated: boolean }>}
   */
  static async logout(userId) {
    const UserModel = User.getModel();
    const user = await UserModel.findById(userId).select('+tokenVersion');
    if (!user) {
      return { invalidated: false };
    }
    user.tokenVersion = AuthService.nextTokenVersion(user.tokenVersion);
    await user.save({ validateBeforeSave: false });
    return { invalidated: true };
  }
}
