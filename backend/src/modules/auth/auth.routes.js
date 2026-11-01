import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, createEmployee, getAllUsers, getMe, forgotPassword, verifyOtp, resetPassword, logout } from './auth.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';
import AppError from '../../utils/AppError.js';

const router = express.Router();

/* Stricter per-IP limit for the password reset flow (OTP spam / brute force) */
const passwordResetLimiter = rateLimit({
  max: 20, // one full reset uses 3 requests; leaves room for a shared office IP
  windowMs: 15 * 60 * 1000, // 15 minutes
  handler: (req, res, next) => next(new AppError('Too many password reset attempts. Please try again in 15 minutes.', 429))
});

/* PUBLIC ROUTES */
router.post('/login', login); /* POST /api/auth/login */
router.post('/forgot-password', passwordResetLimiter, forgotPassword); /* POST /api/auth/forgot-password */
router.post('/verify-otp', passwordResetLimiter, verifyOtp);/* POST /api/auth/verify-otp */
router.patch('/reset-password', passwordResetLimiter, resetPassword); /* PATCH /api/auth/reset-password */
router.post('/logout', logout); /* POST /api/auth/logout */

/* GLOBAL MIDDLEWARE */
router.use(protect);

/* PROTECTED ROUTES */
router.get('/me', getMe); /* GET /api/auth/me */

/* ADMIN ROUTES (TOKEN AND ADMIN ROLE REQUIRED) */
router.post('/create-employee', restrictTo('admin'), createEmployee); /* POST /api/auth/create-employee */
router.get('/', restrictTo('admin'), getAllUsers); /* GET /api/auth */

export default router;