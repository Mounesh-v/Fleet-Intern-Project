import { Router } from 'express';
import DriverController from '../controller/driverController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import RoleMiddleware from '../middleware/roleMiddleware.js';

/**
 * Driver routes — wires HTTP paths to controller methods.
 *
 * OOP notes: shared controller instance; every route requires an
 * authenticated admin session.
 */
const router = Router();
const controller = new DriverController();

router.use(AuthMiddleware.authenticate, RoleMiddleware.requireAdmin);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id/vehicle', controller.assignVehicle);
router.delete('/:id', controller.remove);

export default router;
