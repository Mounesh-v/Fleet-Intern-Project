import { Router } from 'express';
import MasterDataController from '../controller/masterDataController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import RoleMiddleware from '../middleware/roleMiddleware.js';

/**
 * Quarry routes — master-data router with the resource injected
 * into a shared MasterDataController instance.
 *
 * OOP notes: strategy via constructor injection; admin-only guard.
 */
const router = Router();
const controller = new MasterDataController('quarry');

router.use(AuthMiddleware.authenticate, RoleMiddleware.requireAdmin);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
