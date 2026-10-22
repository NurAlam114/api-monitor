const config = require('../config');
const logger = require('../utils/logger');

const SYSTEM_PROMPT =
  'You are an API monitoring assistant for a healthcare company. ' +
  'Write a clear alert of 1 to 2 sentences for an operations team. ' +
  'State the API name, what happened (status code, response time, records), ' +
  'and the likely cause or next check. Plain text only, no markdown, no emojis.';

let genAI = null;
function getModel(modelName) {
  if (!config.ai.apiKey) return null;
  if (!genAI) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(config.ai.apiKey);
  }
  return genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });
}

/** Build the user prompt from one API record and its detected anomalies. */
function buildPrompt(record, anomalies) {
  return [
    `API name: ${record.api_name}`,
    `Status code: ${record.status_code}`,
    `Response time (ms): ${record.response_time_ms}`,
    `Records returned: ${record.records_returned}`,
    `Detected anomalies: ${anomalies.map((a) => `${a.type} (${a.severity}) - ${a.detail}`).join('; ')}`,
    'Write the alert message.',
  ].join('\n');
}

/** Deterministic fallback used when the LLM is unavailable. */
function templateAlert(record, anomalies) {
  const name = record.api_name || 'Unknown API';
  const parts = [];
  for (const a of anomalies) {
    switch (a.type) {
      case 'SERVER_ERROR':
        parts.push(`failed with status ${record.status_code}`);
        break;
      case 'CLIENT_ERROR':
        parts.push(`returned client error status ${record.status_code}`);
        break;
      case 'HIGH_LATENCY':
        parts.push(`responded slowly (${record.response_time_ms}ms)`);
        break;
      case 'NO_DATA':
        parts.push('returned 0 records');
        break;
      case 'INVALID_RESPONSE':
        parts.push('returned an invalid or incomplete response');
        break;
      default:
        parts.push(a.detail);
    }
  }
  const hint = anomalies.some((a) => a.type === 'SERVER_ERROR')
    ? 'Possible outage or data issue.'
    : 'Please investigate the integration.';
  return `${name} ${parts.join(' and ')}. ${hint}`;
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`AI call timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 503 (overloaded), 429 (rate limit), 5xx and timeouts are worth retrying / switching model. */
function isTransient(err) {
  const m = String(err && err.message);
  return /\b(429|500|502|503|504)\b|timed out|overloaded|high demand|ECONNRESET|ETIMEDOUT|fetch failed/i.test(m);
}

/**
 * Generate an alert message. Never throws:
 * returns { message, aiGenerated, model? } and falls back to a template on any failure.
 * Order: primary model (with retry) -> fallback models -> template.
 */
async function generateAlertMessage(record, anomalies) {
  if (!config.ai.apiKey) {
    logger.warn('GEMINI_API_KEY not set, using template alert');
    return { message: templateAlert(record, anomalies), aiGenerated: false };
  }

  const prompt = buildPrompt(record, anomalies);
  const models = [config.ai.model, ...config.ai.fallbackModels.filter((m) => m !== config.ai.model)];
  const deadline = Date.now() + config.ai.totalTimeoutMs;

  for (const modelName of models) {
    for (let attempt = 0; attempt <= config.ai.retriesPerModel; attempt += 1) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      try {
        const result = await withTimeout(
          getModel(modelName).generateContent(prompt),
          Math.min(config.ai.timeoutMs, remaining)
        );
        const text = (result.response.text() || '').trim();
        if (!text) throw new Error('Empty AI response');
        logger.info(`AI alert generated for ${record.api_name} (model ${modelName}, attempt ${attempt + 1})`);
        return { message: text, aiGenerated: true, model: modelName };
      } catch (err) {
        logger.warn(`AI attempt failed for ${record.api_name} [${modelName} #${attempt + 1}]: ${err.message}`);
        if (!isTransient(err)) break; // bad key / bad request: switch model, don't retry
        if (attempt < config.ai.retriesPerModel) await sleep(config.ai.retryDelayMs * (attempt + 1));
      }
    }
    if (Date.now() >= deadline) break;
  }

  logger.error(`AI generation failed for ${record.api_name} on all models, using template`);
  return { message: templateAlert(record, anomalies), aiGenerated: false };
}

module.exports = { generateAlertMessage, buildPrompt, templateAlert };