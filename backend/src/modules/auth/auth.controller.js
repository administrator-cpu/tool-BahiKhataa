import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { promisify } from 'util';
import User from './user.model.js';
import { sendEmail } from '../../utils/sendEmail.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '5d'
  });
};

// Purpose claim that marks the short-lived token issued after OTP verification
export const PASSWORD_RESET_PURPOSE = 'password-reset';
const MAX_OTP_ATTEMPTS = 5;
const OTP_SENT_MESSAGE = 'If an account exists for this email, an OTP has been sent.';

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

// maxAge (not a fixed `expires` date) so the expiry is computed per response
const cookieOptions = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
  secure: true,
  sameSite: 'None'
};

export const login = catchAsync(async (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    return next(new AppError('Please provide email and password', 400));
  }
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
  if (!req.body.email) {
    return next(new AppError('Please provide an email address.', 400));
  }
  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email });
  // Same response whether or not the account exists, so emails can't be enumerated
  if (!user) {
    return res.status(200).json({ status: 'success', message: OTP_SENT_MESSAGE });
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  user.passwordResetOtp = hashOtp(otp);
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetAttempts = 0;

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
      message: OTP_SENT_MESSAGE
    });
  } catch (err) {
    user.passwordResetOtp = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.error("Forgot Password Email Error:", err.message || err);
    return next(new AppError('Error sending email. Try again later.', 500));
  }
});

export const verifyOtp = catchAsync(async (req, res, next) => {
  if (!req.body.otp || !req.body.email) {
    return next(new AppError('Please provide both email and OTP', 400));
  }
  const email = String(req.body.email).toLowerCase();

  const user = await User.findOne({ email })
    .select('+passwordResetOtp +passwordResetExpires +passwordResetAttempts');

  if (!user || !user.passwordResetOtp || !user.passwordResetExpires || user.passwordResetExpires < Date.now()) {
    return next(new AppError('OTP is invalid or has expired', 400));
  }

  const clearOtp = () => {
    user.passwordResetOtp = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetAttempts = 0;
  };

  const isMatch = crypto.timingSafeEqual(
    Buffer.from(hashOtp(req.body.otp)),
    Buffer.from(user.passwordResetOtp)
  );

  if (!isMatch) {
    user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
    // Too many wrong guesses burns the OTP; the user has to request a new one
    if (user.passwordResetAttempts >= MAX_OTP_ATTEMPTS) {
      clearOtp();
      await user.save({ validateBeforeSave: false });
      return next(new AppError('Too many incorrect attempts. Please request a new OTP.', 400));
    }
    await user.save({ validateBeforeSave: false });
    return next(new AppError('OTP is invalid or has expired', 400));
  }

  clearOtp();
  await user.save({ validateBeforeSave: false });

  const temporaryToken = jwt.sign({ id: user._id, purpose: PASSWORD_RESET_PURPOSE }, process.env.JWT_SECRET, {
    expiresIn: '15m'
  });

  res.status(200).json({
    status: 'success',
    temporaryToken,
    message: 'OTP verified. Proceed to reset password.'
  });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  if (!req.body.temporaryToken) {
    return next(new AppError('Reset token is missing. Please verify your OTP again.', 400));
  }

  const decoded = await promisify(jwt.verify)(req.body.temporaryToken, process.env.JWT_SECRET);

  // Only the token issued by verify-otp may reset a password (not a normal login token)
  if (decoded.purpose !== PASSWORD_RESET_PURPOSE) {
    return next(new AppError('Invalid or expired reset token. Please verify your OTP again.', 401));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('User no longer exists.', 404));
  }

  // Single use: once the password has changed, this token is dead
  if (user.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('This reset token has already been used. Please request a new OTP.', 401));
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

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

export const createEmployee = catchAsync(async (req, res, next) => {
  const { name, role, password } = req.body;
  if (!name || !role || !password) {
    return next(new AppError('Please provide name, role and password', 400));
  }
  if (!req.body.email) {
    return next(new AppError('Please provide an email', 400));
  }
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
    maxAge: 10 * 1000,
  });

  res.status(200).json({
    status: 'success',
    message: 'User logged out successfully'
  });
});
