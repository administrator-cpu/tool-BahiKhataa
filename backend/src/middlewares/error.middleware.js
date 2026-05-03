import logger from "../utils/logger.js";

export const globalErrorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === "development";
  
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map(e => e.message).join(", ");
    return res.status(400).json({ success: false, message });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  logger.error("Request Error:", {
    message: err.message,
    statusCode: err.statusCode,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    ...(isDev && { stack: err.stack }),
  });

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