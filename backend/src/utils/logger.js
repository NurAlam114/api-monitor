const path = require('path');
const fs = require('fs');
const { createLogger, format, transports } = require('winston');

const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) =>
      `${timestamp} [${level.toUpperCase()}] ${stack || message}`
    )
  ),
  transports: [
    new transports.Console({
      silent: process.env.NODE_ENV === 'test',
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, stack }) =>
          `${timestamp} ${level} ${stack || message}`
        )
      ),
    }),
    new transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new transports.File({ filename: path.join(logDir, 'combined.log') }),
  ],
});

module.exports = logger;
