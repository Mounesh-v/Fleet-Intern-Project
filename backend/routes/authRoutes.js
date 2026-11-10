import { Router } from 'express';
import AuthController from '../controller/authController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import RoleMiddleware from '../middleware/roleMiddleware.js';
import RateLimitMiddleware from '../middleware/rateLimitMiddleware.js';

/**
 * Auth routes — wires HTTP paths to controller methods.
 *
 * OOP notes:
 * - AuthController is instantiated once (shared controller instance).
 * - Middleware chain: public | authenticate | authenticate+requireAdmin.
 */
const router = Router();
const controller = new AuthController();

// Public — rate-limited against brute-force attempts.
router.post('/login', RateLimitMiddleware.login(), controller.login);

// Authenticated (any active role)
router.get('/me', AuthMiddleware.authenticate, controller.me);
router.post('/logout', AuthMiddleware.authenticate, controller.logout);

// Admin only
router.get(
  '/driver-accounts',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdmin,
  controller.listDriverAccounts,
);
router.post(
  '/create-driver',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdmin,
  controller.createDriver,
);
router.put(
  '/reset-password/:userId',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdmin,
  controller.resetPassword,
);
router.patch(
  '/status/:userId',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdmin,
  controller.setStatus,
);

export default router;
