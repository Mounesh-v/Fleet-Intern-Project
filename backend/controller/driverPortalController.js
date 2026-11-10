import DriverPortalService from '../service/DriverPortalService.js';
import catchAsync from '../utility/catchAsync.js';
import ApiResponse from '../utility/apiResponse.js';

/**
 * DriverPortalController — thin HTTP layer for the driver portal.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: single shared instance; class-field arrow handlers
 * wrapped in catchAsync keep `this` binding and forward errors.
 */
export default class DriverPortalController {
  /** GET /api/driver/me — own profile + assigned vehicle */
  me = catchAsync(async (req, res) => {
    const data = await DriverPortalService.session(req.user.id);
    return ApiResponse.success(res, 'Profile retrieved successfully', data);
  });

  /** GET /api/driver/options — form reference data */
  options = catchAsync(async (_req, res) => {
    const data = await DriverPortalService.options();
    return ApiResponse.success(res, 'Options retrieved successfully', data);
  });

  /** GET /api/driver/entries — own work entries only */
  entries = catchAsync(async (req, res) => {
    const entries = await DriverPortalService.listEntries(req.user.id, req.query);
    return ApiResponse.success(res, 'Entries retrieved successfully', { entries });
  });

  /** POST /api/driver/entries — submit own work entry */
  createEntry = catchAsync(async (req, res) => {
    const entry = await DriverPortalService.createEntry(req.user.id, req.body);
    return ApiResponse.success(res, 'Work entry submitted successfully', { entry }, 201);
  });
}
