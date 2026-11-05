import { Router } from 'express';
import DashboardController from '../controller/dashboardController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import RoleMiddleware from '../middleware/roleMiddleware.js';

/**
 * Dashboard routes — admin stats aggregate.
 *
 * OOP notes: shared controller instance; admin-only guard.
 */
const router = Router();
const controller = new DashboardController();

router.use(AuthMiddleware.authenticate, RoleMiddleware.requireAdmin);

router.get('/', controller.get);

export default router;
