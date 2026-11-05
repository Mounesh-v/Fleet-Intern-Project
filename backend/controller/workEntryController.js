import WorkEntryService from '../service/WorkEntryService.js';
import catchAsync from '../utility/catchAsync.js';
import ApiResponse from '../utility/apiResponse.js';

/**
 * WorkEntryController — thin HTTP layer for work entry routes.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: single shared instance; class-field arrow handlers
 * wrapped in catchAsync keep `this` binding and forward errors.
 */
export default class WorkEntryController {
  /** GET /api/admin/work-entries */
  list = catchAsync(async (req, res) => {
    const entries = await WorkEntryService.list(req.query);
    return ApiResponse.success(res, 'Work entries retrieved successfully', {
      entries,
    });
  });

  /** GET /api/admin/work-entries/:id */
  getById = catchAsync(async (req, res) => {
    const entry = await WorkEntryService.getById(req.params.id);
    return ApiResponse.success(res, 'Work entry retrieved successfully', {
      entry,
    });
  });

  /** POST /api/admin/work-entries */
  create = catchAsync(async (req, res) => {
    const entry = await WorkEntryService.create(req.body, req.user.id);
    return ApiResponse.success(res, 'Work entry created successfully', { entry }, 201);
  });

  /** PATCH /api/admin/work-entries/:id/status */
  setStatus = catchAsync(async (req, res) => {
    const entry = await WorkEntryService.setStatus(
      req.params.id,
      req.body?.status,
      req.user.id,
    );
    return ApiResponse.success(res, 'Work entry status updated successfully', {
      entry,
    });
  });
}
