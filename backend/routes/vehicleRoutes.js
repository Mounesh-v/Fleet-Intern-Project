import { Router } from 'express';
import VehicleController from '../controller/vehicleController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import RoleMiddleware from '../middleware/roleMiddleware.js';

/**
 * Vehicle routes — wires HTTP paths to controller methods.
 *
 * OOP notes: shared controller instance; every route requires an
 * authenticated admin session.
 */
const router = Router();
const controller = new VehicleController();

router.use(AuthMiddleware.authenticate, RoleMiddleware.requireAdmin);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
