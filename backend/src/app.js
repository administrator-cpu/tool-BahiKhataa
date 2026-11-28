import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import compression from 'compression';
// Registers the Mongoose timing plugin; must run before the route/model imports below
import { serverTiming } from './middlewares/serverTiming.js';

import logger from './utils/logger.js';
import AppError from './utils/AppError.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';
import { sanitizeRequest } from './middlewares/sanitize.middleware.js';

import authRoutes from './modules/auth/auth.routes.js';
import customerRoutes from './modules/customer/customer.routes.js';
import ledgerRoutes from './modules/ledger/ledger.routes.js';
import integrationRoutes from './modules/integration/integration.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import vendorRouter from './modules/Vendor/vendor.routes.js';
import purchaseLedgerRouter from './modules/PurchaseLedger/purcahseLedger.routes.js'
import syncRoutes from './modules/sync/sync.routes.js';
import circuitBillingRoutes from './modules/circuitBilling/circuitBilling.routes.js';

const app = express();

// Logged-in users are limited per account, so an office sharing one IP doesn't hit the cap.
// Anything without a valid login token is still limited per IP.
const rateLimitKey = (req) => {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const { id } = jwt.verify(token, process.env.JWT_SECRET);
      if (id) return `user:${id}`;
    } catch { /* fall through to IP */ }
  }
  return ipKeyGenerator(req.ip);
};

const limiter = rateLimit({
  max: 300, // per user (or per IP when not logged in)
  windowMs: 2 * 60 * 1000, // 2 minutes
  keyGenerator: rateLimitKey,
  message: 'Too many requests from this IP, please try again in 15 minutes!',
  skip: (req) => {
    // /api/sync has its own limiter (see sync.routes.js)
    if (req.originalUrl.startsWith('/api/integration') || req.originalUrl.startsWith('/api/sync')) {
      return true; 
    }
    return false;
  },
  handler: (req, res, next, options) => {
    return next(new AppError(options.message, 429));
  }
});


const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
  "https://fab5connect.com",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError("CORS not allowed by server", 403));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'token'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // Every API call is cross-origin with an Authorization header, so it is preflighted.
  // Without this the browser re-sends OPTIONS after 5s; Chrome caps the cache at 2h.
  maxAge: 7200,
};
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors(corsOptions));

app.options(/.*/, cors(corsOptions));
app.use(compression({ threshold: 1024 }));
app.use(serverTiming);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(sanitizeRequest);
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
app.use('/api/vendors', vendorRouter);
app.use('/api/purchase-ledger', purchaseLedgerRouter)
app.use('/api/sync', syncRoutes);
app.use('/api/circuit-billing', circuitBillingRoutes);

app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({ status: "ok", db: dbState, uptime: process.uptime() });
});

app.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;