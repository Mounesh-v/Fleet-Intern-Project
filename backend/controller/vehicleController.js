import VehicleService from '../service/VehicleService.js';
import catchAsync from '../utility/catchAsync.js';
import ApiResponse from '../utility/apiResponse.js';

/**
 * VehicleController — thin HTTP layer for vehicle routes.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: single shared instance; class-field arrow handlers
 * wrapped in catchAsync keep `this` binding and forward errors.
 */
export default class VehicleController {
  /** GET /api/admin/vehicles */
  list = catchAsync(async (req, res) => {
    const vehicles = await VehicleService.list(req.query);
    return ApiResponse.success(res, 'Vehicles retrieved successfully', {
      vehicles,
    });
  });

  /** GET /api/admin/vehicles/:id */
  getById = catchAsync(async (req, res) => {
    const vehicle = await VehicleService.getById(req.params.id);
    return ApiResponse.success(res, 'Vehicle retrieved successfully', {
      vehicle,
    });
  });

  /** POST /api/admin/vehicles */
  create = catchAsync(async (req, res) => {
    const vehicle = await VehicleService.create(req.body);
    return ApiResponse.success(res, 'Vehicle created successfully', { vehicle }, 201);
  });

  /** PUT /api/admin/vehicles/:id */
  update = catchAsync(async (req, res) => {
    const vehicle = await VehicleService.update(req.params.id, req.body);
    return ApiResponse.success(res, 'Vehicle updated successfully', { vehicle });
  });

  /** DELETE /api/admin/vehicles/:id */
  remove = catchAsync(async (req, res) => {
    const result = await VehicleService.remove(req.params.id);
    return ApiResponse.success(res, 'Vehicle deleted successfully', result);
  });
}
