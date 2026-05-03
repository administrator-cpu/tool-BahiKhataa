import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from './user.model.js';
import { sendEmail } from '../../utils/sendEmail.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '5d'
  });
};

const cookieOptions = {
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  httpOnly: true,
  secure: true,
  sameSite: 'None'
};

export const login = catchAsync(async (req, res, next) => {
  const email = req.body.email.toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  const token = signToken(user._id);

  res.cookie('token', token, cookieOptions);

  user.password = undefined;

  res.status(200).json({
    status: 'success',
    token,
    data: { user }
  });
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user found with that email address.', 404));
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  user.passwordResetOtp = crypto.createHash('sha256').update(otp).digest('hex');
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  try {
    const emailHtml = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Password Reset Request</h2>
      <p>Your one-time password (OTP) is:</p>
      <h1 style="color: #2563eb; letter-spacing: 5px;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
    </div>
  `;

    await sendEmail({
      email: user.email,
      subject: 'Your Bahi Khata Password Reset OTP',
      message: emailHtml
    });

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to email!'
    });
  } catch (err) {
    user.passwordResetOtp = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Error sending email. Try again later.', 500));
  }
});

export const verifyOtp = catchAsync(async (req, res, next) => {
  const hashedOtp = crypto.createHash('sha256').update(req.body.otp).digest('hex');

  const user = await User.findOne({
    email: req.body.email,
    passwordResetOtp: hashedOtp,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('OTP is invalid or has expired', 400));
  }
  user.passwordResetOtp = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateBeforeSave: false });

  const temporaryToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '15m'
  });

  res.status(200).json({
    status: 'success',
    temporaryToken,
    message: 'OTP verified. Proceed to reset password.'
  });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const decoded = jwt.verify(req.body.temporaryToken, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('User no longer exists.', 404));
  }

  user.password = req.body.password;
  await user.save();

  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
    message: 'Password successfully reset!'
  });
});

export const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().select('name email role _id');
  console.log(users);
  

  // 3. Send the response
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

export const createEmployee = catchAsync(async (req, res, next) => {
  const { name, role, password } = req.body;
  const email = req.body.email.toLowerCase();

  const allowedDomain = process.env.ALLOWED_DOMAIN;
  if (!email.endsWith(allowedDomain)) {
    return next(new AppError(`Access denied. Email must belong to the ${allowedDomain} domain.`, 403));
  }

  const newUser = await User.create({ name, email, role, password });

  res.status(201).json({
    status: 'success',
    data: {
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
    }
  });

});

export const getMe = catchAsync(async (req, res, next) => {
  const currentUser = await User.findById(req.user.id).select('name email role _id');

  if (!currentUser) {
    return next(new AppError('User belonging to this token no longer exists.', 401));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: currentUser
    }
  });
});

export const logout = catchAsync(async (req, res, next) => {
  res.cookie('token', 'loggedout', {
    ...cookieOptions,
    expires: new Date(Date.now() + 10 * 1000),
  });

  res.status(200).json({
    status: 'success',
    message: 'User logged out successfully'
  });
});
