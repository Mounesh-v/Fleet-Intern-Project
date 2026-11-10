import { Router } from 'express';
import ExpenseController from '../controller/expenseController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import RoleMiddleware from '../middleware/roleMiddleware.js';

/**
 * Expense routes — wires HTTP paths to controller methods.
 *
 * OOP notes: shared controller instance; admin-only guard.
 */
const router = Router();
const controller = new ExpenseController();

router.use(AuthMiddleware.authenticate, RoleMiddleware.requireAdmin);

router.get('/', controller.list);
router.post('/', controller.create);
router.post('/bulk-delete', controller.removeMany);
router.delete('/:id', controller.remove);

export default router;
