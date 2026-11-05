import RateService from '../service/RateService.js';
import catchAsync from '../utility/catchAsync.js';
import ApiResponse from '../utility/apiResponse.js';

/**
 * RateController — thin HTTP layer for rate card routes.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: single shared instance; class-field arrow handlers
 * wrapped in catchAsync keep `this` binding and forward errors.
 */
export default class RateController {
  /** GET /api/admin/rates */
  list = catchAsync(async (req, res) => {
    const rates = await RateService.list(req.query);
    return ApiResponse.success(res, 'Rates retrieved successfully', { rates });
  });

  /** POST /api/admin/rates */
  create = catchAsync(async (req, res) => {
    const rate = await RateService.create(req.body);
    return ApiResponse.success(res, 'Rate created successfully', { rate }, 201);
  });

  /** DELETE /api/admin/rates/:id */
  remove = catchAsync(async (req, res) => {
    const result = await RateService.remove(req.params.id);
    return ApiResponse.success(res, 'Rate deleted successfully', result);
  });
}
