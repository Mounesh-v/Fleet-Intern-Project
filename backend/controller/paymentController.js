import PaymentService from '../service/PaymentService.js';
import catchAsync from '../utility/catchAsync.js';
import ApiResponse from '../utility/apiResponse.js';

/**
 * PaymentController — thin HTTP layer for payment routes.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: single shared instance; class-field arrow handlers
 * wrapped in catchAsync keep `this` binding and forward errors.
 */
export default class PaymentController {
  /** GET /api/admin/payments */
  list = catchAsync(async (req, res) => {
    const payments = await PaymentService.list(req.query);
    return ApiResponse.success(res, 'Payments retrieved successfully', {
      payments,
    });
  });

  /** POST /api/admin/payments */
  create = catchAsync(async (req, res) => {
    const payment = await PaymentService.create(req.body);
    return ApiResponse.success(res, 'Payment recorded successfully', { payment }, 201);
  });

  /** DELETE /api/admin/payments/:id */
  remove = catchAsync(async (req, res) => {
    const result = await PaymentService.remove(req.params.id);
    return ApiResponse.success(res, 'Payment deleted successfully', result);
  });
}
