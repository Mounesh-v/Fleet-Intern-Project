import { Router } from 'express';
import DriverPortalController from '../controller/driverPortalController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import RoleMiddleware from '../middleware/roleMiddleware.js';

/**
 * Driver portal routes — self-service endpoints for signed-in drivers.
 *
 * OOP notes: shared controller instance; every route requires an
 * authenticated DRIVER session (drivers never reach admin APIs and
 * admins get 403 here — role scope is explicit per router).
 */
const router = Router();
const controller = new DriverPortalController();

router.use(AuthMiddleware.authenticate, RoleMiddleware.requireDriver);

router.get('/me', controller.me);
router.get('/options', controller.options);
router.get('/entries', controller.entries);
router.post('/entries', controller.createEntry);

export default router;
