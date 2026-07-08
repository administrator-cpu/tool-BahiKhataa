export const protectInternalApps = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey && apiKey === process.env.INTERNAL_BAHIKHATA_SECRET) {
    return next();
  }

  return res.status(401).json({
    status: 'fail',
    message: 'Unauthorized internal request. Invalid API Key.'
  });
};