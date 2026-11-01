// Strips MongoDB operator keys ("$gt", "$ne", ...) and dotted keys from the JSON body
// so user input can never be turned into a query operator (NoSQL injection).
//
// express-mongo-sanitize is not used because it reassigns req.query, which is a
// read-only getter in Express 5. Query strings are safe here anyway: Express 5's
// default "simple" query parser only produces strings, never nested objects.

const isUnsafeKey = (key) => key.startsWith('$') || key.includes('.') || key === '__proto__';

const stripUnsafeKeys = (value) => {
  if (Array.isArray(value)) {
    value.forEach(stripUnsafeKeys);
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (isUnsafeKey(key)) {
        delete value[key];
      } else {
        stripUnsafeKeys(value[key]);
      }
    }
  }
};

export const sanitizeRequest = (req, res, next) => {
  if (req.body) stripUnsafeKeys(req.body);
  next();
};
