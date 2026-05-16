import express from 'express';
import { login, createEmployee, getAllUsers, getMe, forgotPassword, verifyOtp, resetPassword, logout } from './auth.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/* PUBLIC ROUTES */
router.post('/login', login); /* POST /api/auth/login */
router.post('/forgot-password', forgotPassword); /* POST /api/auth/forgot-password */
router.post('/verify-otp', verifyOtp);/* POST /api/auth/verify-otp */
router.patch('/reset-password', resetPassword); /* PATCH /api/auth/reset-password */
router.post('/logout', logout); /* POST /api/auth/logout */

/* GLOBAL MIDDLEWARE */
router.use(protect);

/* PROTECTED ROUTES */
router.get('/me', getMe); /* GET /api/auth/me */

/* ADMIN ROUTES (TOKEN AND ADMIN ROLE REQUIRED) */
router.post('/create-employee', restrictTo('admin'), createEmployee); /* POST /api/auth/create-employee */
router.get('/', restrictTo('admin'), getAllUsers); /* GET /api/auth */

export default router;