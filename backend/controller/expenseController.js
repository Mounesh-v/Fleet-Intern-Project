import ExpenseService from '../service/ExpenseService.js';
import catchAsync from '../utility/catchAsync.js';
import ApiResponse from '../utility/apiResponse.js';

/**
 * ExpenseController — thin HTTP layer for expense routes.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: single shared instance; class-field arrow handlers
 * wrapped in catchAsync keep `this` binding and forward errors.
 */
export default class ExpenseController {
  /** GET /api/admin/expenses */
  list = catchAsync(async (req, res) => {
    const expenses = await ExpenseService.list(req.query);
    return ApiResponse.success(res, 'Expenses retrieved successfully', {
      expenses,
    });
  });

  /** POST /api/admin/expenses */
  create = catchAsync(async (req, res) => {
    const expense = await ExpenseService.create(req.body);
    return ApiResponse.success(res, 'Expense recorded successfully', { expense }, 201);
  });

  /** DELETE /api/admin/expenses/:id */
  remove = catchAsync(async (req, res) => {
    const result = await ExpenseService.remove(req.params.id);
    return ApiResponse.success(res, 'Expense deleted successfully', result);
  });

  /** POST /api/admin/expenses/bulk-delete */
  removeMany = catchAsync(async (req, res) => {
    const result = await ExpenseService.removeMany(req.body?.ids);
    return ApiResponse.success(res, 'Expenses deleted successfully', result);
  });
}
