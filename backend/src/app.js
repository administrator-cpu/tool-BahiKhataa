import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import logger from './utils/logger.js';
import AppError from './utils/AppError.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';

import authRoutes from './modules/auth/auth.routes.js';
import customerRoutes from './modules/customer/customer.routes.js';
import ledgerRoutes from './modules/ledger/ledger.routes.js';
import integrationRoutes from './modules/integration/integration.routes.js';
import reportRoutes from './modules/reports/report.routes.js';

const app = express();

const limiter = rateLimit({
  max: 100, // Limit each IP to 100 requests
  windowMs: 2 * 60 * 1000, // 2 minutes
  message: 'Too many requests from this IP, please try again in 15 minutes!',
  handler: (req, res, next, options) => {
    return next(new AppError(options.message, 429));
  }
});

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
app.use('/api', limiter); 

app.use(
  morgan(":method :url :status :response-time ms - :res[content-length]", {
    skip: (req) => req.path === "/health",
    stream: { write: (message) => logger.http(message.trim()) }
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/reports', reportRoutes);

app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({ status: "ok", db: dbState, uptime: process.uptime() });
});

app.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;