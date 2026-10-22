const logger = require('../utils/logger');

function notFound(req, res) {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    logger.warn(`Bad JSON body: ${err.message}`);
    return res.status(400).json({ success: false, error: 'Invalid JSON in request body' });
  }
  const status = err.status || err.statusCode || 500;
  logger.error(`${req.method} ${req.originalUrl} -> ${status}: ${err.stack || err.message}`);
  res.status(status).json({
    success: false,
    error: status === 500 ? 'Internal server error' : err.message,
  });
}

module.exports = { notFound, errorHandler };
