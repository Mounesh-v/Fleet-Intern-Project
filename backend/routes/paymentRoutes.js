import { Router } from 'express';
import PaymentController from '../controller/paymentController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import RoleMiddleware from '../middleware/roleMiddleware.js';

/**
 * Payment routes — wires HTTP paths to controller methods.
 *
 * OOP notes: shared controller instance; admin-only guard.
 */
const router = Router();
const controller = new PaymentController();

router.use(AuthMiddleware.authenticate, RoleMiddleware.requireAdmin);

router.get('/', controller.list);
router.post('/', controller.create);
router.post('/bulk-delete', controller.removeMany);
router.delete('/:id', controller.remove);

export default router;
