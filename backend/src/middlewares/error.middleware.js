import logger from "../utils/logger.js";
import AppError from "../utils/AppError.js";

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

export const globalErrorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === "development";

  let error = { ...err };
  error.message = err.message;
  error.name = err.name;

  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (err.name === "ValidationError") {
    err = new AppError(Object.values(err.errors).map((e) => e.message).join(", "),400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err = new AppError(`${field} already exists`, 409);
  }

  logger.error(
    `${req.method} ${req.originalUrl} | ${err.message}${err.statusCode ? ` | Status: ${err.statusCode}` : ""}`
  );

  if (isDev && err.stack) {
    logger.error(err.stack);
  }

  const message = isDev
    ? err.message
    : err.isOperational
      ? err.message
      : "Something went wrong";

  res.status(err.statusCode || 500).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }),
  });
};