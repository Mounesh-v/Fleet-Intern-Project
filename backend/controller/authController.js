import AuthService from '../service/AuthService.js';
import catchAsync from '../utility/catchAsync.js';
import ApiResponse from '../utility/apiResponse.js';

/**
 * AuthController — thin HTTP layer for auth routes.
 *
 * Layering: routes → controller → service → model
 *
 * OOP concepts:
 * - Single Responsibility: parse request → call service → shape response.
 * - Encapsulation: no business rules here; AuthService (service layer) owns them.
 */
export default class AuthController {
  /** POST /api/auth/login */
  login = catchAsync(async (req, res) => {
    const { token, user } = await AuthService.login(req.body);
    return ApiResponse.success(res, 'Login successful', { token, user });
  });

  /** POST /api/auth/create-driver (Admin) */
  createDriver = catchAsync(async (req, res) => {
    const user = await AuthService.createDriver(req.body);
    return ApiResponse.success(
      res,
      'Driver account created successfully',
      { user },
      201,
    );
  });

  /** GET /api/auth/driver-accounts (Admin) */
  listDriverAccounts = catchAsync(async (_req, res) => {
    const accounts = await AuthService.listDriverAccounts();
    return ApiResponse.success(res, 'Driver accounts retrieved successfully', {
      accounts,
    });
  });

  /** PUT /api/auth/reset-password/:userId (Admin) */
  resetPassword = catchAsync(async (req, res) => {
    const user = await AuthService.resetPassword(req.params.userId, req.body);
    return ApiResponse.success(res, 'Password reset successful', { user });
  });

  /** PATCH /api/auth/status/:userId (Admin) */
  setStatus = catchAsync(async (req, res) => {
    const user = await AuthService.setStatus(req.params.userId, req.body);
    return ApiResponse.success(
      res,
      `Driver account ${user.status.toLowerCase()} successfully`,
      { user },
    );
  });

  /** GET /api/auth/me */
  me = catchAsync(async (req, res) => {
    const user = await AuthService.getMe(req.user.id, req.user.tokenVersion);
    return ApiResponse.success(res, 'Current user retrieved successfully', {
      user,
    });
  });

  /** POST /api/auth/logout */
  logout = catchAsync(async (req, res) => {
    await AuthService.logout(req.user.id);
    return ApiResponse.success(res, 'Logged out successfully', {});
  });
}
