import DashboardService from '../service/DashboardService.js';
import catchAsync from '../utility/catchAsync.js';
import ApiResponse from '../utility/apiResponse.js';

/**
 * DashboardController — thin HTTP layer for admin dashboard stats.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: single shared instance; class-field arrow handlers
 * wrapped in catchAsync keep `this` binding and forward errors.
 */
export default class DashboardController {
  /** GET /api/admin/dashboard */
  get = catchAsync(async (req, res) => {
    const stats = await DashboardService.getStats(req.query);
    return ApiResponse.success(res, 'Dashboard stats retrieved successfully', stats);
  });
}
