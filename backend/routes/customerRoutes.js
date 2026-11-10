import { Router } from 'express';
import MasterDataController from '../controller/masterDataController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import RoleMiddleware from '../middleware/roleMiddleware.js';
import StatementService from '../service/StatementService.js';
import catchAsync from '../utility/catchAsync.js';
import ApiResponse from '../utility/apiResponse.js';

/**
 * Customer routes — master-data router with the resource injected
 * into a shared MasterDataController instance, plus the account
 * statement endpoint.
 *
 * OOP notes: strategy via constructor injection; admin-only guard.
 */
const router = Router();
const controller = new MasterDataController('customer');

router.use(AuthMiddleware.authenticate, RoleMiddleware.requireAdmin);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.get(
  '/:id/statement',
  catchAsync(async (req, res) => {
    const data = await StatementService.getStatement(req.params.id);
    return ApiResponse.success(res, 'Statement retrieved successfully', data);
  }),
);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
