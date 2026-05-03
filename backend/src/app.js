import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
// import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';

import logger from './utils/logger.js';
import AppError from './utils/AppError.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';

import authRoutes from './modules/auth/auth.routes.js';
import customerRoutes from './modules/customer/customer.routes.js';
import ledgerRoutes from './modules/ledger/ledger.routes.js';

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
].filter(Boolean)

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError("CORS not allowed by server", 403));
  },
  credentials: true,
}));

app.options(/.*/, cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(cookieParser());

// app.use(mongoSanitize({
//   onSanitize: ({ req, key }) => {
//     logger.warn("Suspicious key detected in request and sanitized", { key, path: req.path, ip: req.ip });
//   }
// }));

app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
    skip: (req) => req.path === "/health",
    stream: { write: (message) => logger.http(message.trim()) }
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/ledger', ledgerRoutes);

app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({ status: "ok", db: dbState, uptime: process.uptime() });
});

app.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});;

app.use(globalErrorHandler);

export default app;