import logger from "../utils/logger.js";
import AppError from "../utils/AppError.js";

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

export const globalErrorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === "development";

  // Normalise known errors into operational AppErrors (single variable, so the
  // response below always uses the converted error)
  let error = err;

  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (err.name === "ValidationError") {
    error = new AppError(Object.values(err.errors).map((e) => e.message).join(", "), 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new AppError(`${field} already exists`, 409);
  }

  logger.error(
    `${req.method} ${req.originalUrl} | ${error.message}${error.statusCode ? ` | Status: ${error.statusCode}` : ""}`
  );

  if (isDev && err.stack) {
    logger.error(err.stack);
  }

  const message = isDev
    ? error.message
    : error.isOperational
      ? error.message
      : "Something went wrong";

  res.status(error.statusCode || 500).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }),
  });
};
