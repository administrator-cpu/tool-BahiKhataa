import { AsyncLocalStorage } from 'node:async_hooks';
import mongoose from 'mongoose';

// Adds a `Server-Timing` header to every API response so DevTools (Network → Timing)
// shows how long the request spent in MongoDB and how many queries it ran.
// Must be imported before any model is compiled (top of app.js).

const als = new AsyncLocalStorage();
const STARTED = Symbol('dbStarted');
const QUERY_OPS = ['find', 'findOne', 'countDocuments', 'findOneAndUpdate', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'];

const record = (started) => {
  const store = als.getStore();
  if (!store || !started) return;
  store.db += performance.now() - started;
  store.n += 1;
};

mongoose.plugin((schema) => {
  schema.pre(QUERY_OPS, function () { this[STARTED] = performance.now(); });
  schema.post(QUERY_OPS, function () { record(this[STARTED]); });
  schema.pre('aggregate', function () { this[STARTED] = performance.now(); });
  schema.post('aggregate', function () { record(this[STARTED]); });
  schema.pre('save', function () { if (!this.$isSubdocument) this.$locals[STARTED] = performance.now(); });
  schema.post('save', function () { if (!this.$isSubdocument) record(this.$locals[STARTED]); });
});

export const serverTiming = (req, res, next) => {
  const store = { db: 0, n: 0, started: performance.now() };
  const writeHead = res.writeHead;
  res.writeHead = function (...args) {
    if (!res.headersSent) {
      const total = performance.now() - store.started;
      res.setHeader(
        'Server-Timing',
        `db;desc="${store.n} queries (summed)";dur=${store.db.toFixed(1)}, total;dur=${total.toFixed(1)}`
      );
      if (req.headers.origin) res.setHeader('Timing-Allow-Origin', req.headers.origin);
    }
    return writeHead.apply(this, args);
  };
  als.run(store, next);
};
