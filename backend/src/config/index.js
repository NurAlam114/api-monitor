require('dotenv').config();

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== undefined && value !== '' ? n : fallback;
};

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/api_monitor',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  thresholds: {
    latencyMs: num(process.env.LATENCY_THRESHOLD_MS, 3000),
    latencyCriticalMs: num(process.env.LATENCY_CRITICAL_MS, 5000),
  },

  ai: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    // Tried in order if the primary model keeps failing (overloaded, quota, etc.)
    fallbackModels: (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.6-flash,gemini-3.1-flash-lite')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
    timeoutMs: num(process.env.AI_TIMEOUT_MS, 10000), // per attempt
    totalTimeoutMs: num(process.env.AI_TOTAL_TIMEOUT_MS, 25000), // all attempts together
    retriesPerModel: num(process.env.AI_RETRIES_PER_MODEL, 1),
    retryDelayMs: num(process.env.AI_RETRY_DELAY_MS, 1000),
  },

  email: {
    enabled: String(process.env.EMAIL_ENABLED).toLowerCase() === 'true',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
    to: process.env.EMAIL_TO || '',
  },
};