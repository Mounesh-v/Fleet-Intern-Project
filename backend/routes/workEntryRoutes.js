import { Router } from 'express';
import WorkEntryController from '../controller/workEntryController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import RoleMiddleware from '../middleware/roleMiddleware.js';

/**
 * Work entry routes — wires HTTP paths to controller methods.
 *
 * OOP notes: shared controller instance; admin-only guard.
 * Status transitions (verify / lock / reopen) are PATCH :id/status.
 */
const router = Router();
const controller = new WorkEntryController();

router.use(AuthMiddleware.authenticate, RoleMiddleware.requireAdmin);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.patch('/:id/status', controller.setStatus);

export default router;
