import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Public routes
router.post('/login',   AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Protected routes
router.post('/logout',          authenticate, AuthController.logout);
router.get('/me',               authenticate, AuthController.getMe);
router.put('/change-password',  authenticate, AuthController.changePassword);

export default router;
