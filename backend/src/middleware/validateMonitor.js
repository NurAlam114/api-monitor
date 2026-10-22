const MAX_BATCH = 500;

/** Body must be a non-empty array (or a single object, which is wrapped). */
module.exports = function validateMonitor(req, res, next) {
  let body = req.body;
  if (body && !Array.isArray(body) && typeof body === 'object') {
    body = [body];
  }
  if (!Array.isArray(body) || body.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Request body must be a non-empty JSON array of API records',
    });
  }
  if (body.length > MAX_BATCH) {
    return res.status(413).json({
      success: false,
      error: `Batch too large. Maximum ${MAX_BATCH} records per request`,
    });
  }
  req.body = body;
  next();
};
