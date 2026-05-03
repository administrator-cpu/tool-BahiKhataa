import express from 'express';
import { login, createEmployee, getAllUsers, getMe, forgotPassword, verifyOtp, resetPassword, logout } from './auth.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js'; 

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.patch('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.post('/create-employee', protect, restrictTo('admin'), createEmployee);
router.get('/', protect, restrictTo('admin'), getAllUsers);
router.post('/logout', logout);

export default router;
