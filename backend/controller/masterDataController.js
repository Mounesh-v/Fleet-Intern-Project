import MasterDataService from '../service/MasterDataService.js';
import catchAsync from '../utility/catchAsync.js';
import ApiResponse from '../utility/apiResponse.js';

const LABELS = { quarry: 'Quarry', material: 'Material', customer: 'Customer' };

/**
 * MasterDataController — thin HTTP layer for quarry/material/customer
 * routes. Parameterized by resource so one controller class serves
 * all three master-data routers.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts:
 * - Composition via constructor-injected resource (strategy).
 * - Class-field arrow handlers keep per-instance `this` binding.
 */
export default class MasterDataController {
  /** @param {'quarry'|'material'|'customer'} resource */
  constructor(resource) {
    this.resource = resource;
    this.label = LABELS[resource] || 'Record';
  }

  /** GET /api/admin/<resource>s */
  list = catchAsync(async (req, res) => {
    const records = await MasterDataService.list(this.resource, req.query);
    return ApiResponse.success(res, `${this.label}s retrieved successfully`, {
      [`${this.resource}s`]: records,
    });
  });

  /** GET /api/admin/<resource>s/:id */
  getById = catchAsync(async (req, res) => {
    const record = await MasterDataService.getById(this.resource, req.params.id);
    return ApiResponse.success(res, `${this.label} retrieved successfully`, {
      [this.resource]: record,
    });
  });

  /** POST /api/admin/<resource>s */
  create = catchAsync(async (req, res) => {
    const record = await MasterDataService.create(this.resource, req.body);
    return ApiResponse.success(res, `${this.label} created successfully`, {
      [this.resource]: record,
    }, 201);
  });

  /** PUT /api/admin/<resource>s/:id */
  update = catchAsync(async (req, res) => {
    const record = await MasterDataService.update(
      this.resource,
      req.params.id,
      req.body,
    );
    return ApiResponse.success(res, `${this.label} updated successfully`, {
      [this.resource]: record,
    });
  });

  /** DELETE /api/admin/<resource>s/:id */
  remove = catchAsync(async (req, res) => {
    const result = await MasterDataService.remove(this.resource, req.params.id);
    return ApiResponse.success(res, `${this.label} deleted successfully`, result);
  });
}
