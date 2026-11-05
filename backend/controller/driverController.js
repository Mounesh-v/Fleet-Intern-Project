import DriverService from '../service/DriverService.js';
import catchAsync from '../utility/catchAsync.js';
import ApiResponse from '../utility/apiResponse.js';

/**
 * DriverController — thin HTTP layer for driver routes.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: single shared instance; class-field arrow handlers
 * wrapped in catchAsync keep `this` binding and forward errors.
 */
export default class DriverController {
  /** GET /api/admin/drivers */
  list = catchAsync(async (req, res) => {
    const drivers = await DriverService.list(req.query);
    return ApiResponse.success(res, 'Drivers retrieved successfully', {
      drivers,
    });
  });

  /** GET /api/admin/drivers/:id */
  getById = catchAsync(async (req, res) => {
    const driver = await DriverService.getById(req.params.id);
    return ApiResponse.success(res, 'Driver retrieved successfully', { driver });
  });

  /** POST /api/admin/drivers */
  create = catchAsync(async (req, res) => {
    const driver = await DriverService.create(req.body);
    return ApiResponse.success(res, 'Driver created successfully', { driver }, 201);
  });

  /** PUT /api/admin/drivers/:id */
  update = catchAsync(async (req, res) => {
    const driver = await DriverService.update(req.params.id, req.body);
    return ApiResponse.success(res, 'Driver updated successfully', { driver });
  });

  /** PATCH /api/admin/drivers/:id/vehicle (Admin) — assign / unassign */
  assignVehicle = catchAsync(async (req, res) => {
    const driver = await DriverService.assignVehicle(req.params.id, req.body);
    return ApiResponse.success(res, 'Vehicle assignment updated successfully', {
      driver,
    });
  });

  /** DELETE /api/admin/drivers/:id */
  remove = catchAsync(async (req, res) => {
    const result = await DriverService.remove(req.params.id);
    return ApiResponse.success(res, 'Driver deleted successfully', result);
  });
}
