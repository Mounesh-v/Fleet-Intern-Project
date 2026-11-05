import { Router } from 'express';
import RateController from '../controller/rateController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import RoleMiddleware from '../middleware/roleMiddleware.js';

/**
 * Rate routes — wires HTTP paths to controller methods.
 *
 * OOP notes: shared controller instance; admin-only guard.
 */
const router = Router();
const controller = new RateController();

router.use(AuthMiddleware.authenticate, RoleMiddleware.requireAdmin);

router.get('/', controller.list);
router.post('/', controller.create);
router.delete('/:id', controller.remove);

export default router;
