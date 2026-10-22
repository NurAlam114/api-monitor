const config = require('../config');

const TYPES = {
  HIGH_LATENCY: 'HIGH_LATENCY',
  SERVER_ERROR: 'SERVER_ERROR',
  CLIENT_ERROR: 'CLIENT_ERROR',
  NO_DATA: 'NO_DATA',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Validate the shape of one API health record.
 * Returns an array of human-readable problems (empty if valid).
 */
function validateRecord(record) {
  const problems = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return ['record is not an object'];
  }
  if (typeof record.api_name !== 'string' || !record.api_name.trim()) {
    problems.push('api_name missing');
  }
  if (!isNum(record.response_time_ms) || record.response_time_ms < 0) {
    problems.push('response_time_ms missing or invalid');
  }
  if (!Number.isInteger(record.status_code) || record.status_code < 100 || record.status_code > 599) {
    problems.push('status_code missing or invalid');
  }
  if (!isNum(record.records_returned) || record.records_returned < 0) {
    problems.push('records_returned missing or invalid');
  }
  return problems;
}

/**
 * Pure function: one record in, list of anomalies out.
 * Each anomaly: { type, severity, detail }
 */
function detectAnomalies(record, thresholds = config.thresholds) {
  const anomalies = [];
  const problems = validateRecord(record);

  const apiName = record && record.api_name ? record.api_name : 'UnknownAPI';

  if (problems.length) {
    anomalies.push({
      type: TYPES.INVALID_RESPONSE,
      severity: 'medium',
      detail: `Invalid data for ${apiName}: ${problems.join(', ')}`,
    });
  }

  if (isNum(record && record.response_time_ms)) {
    const ms = record.response_time_ms;
    if (ms >= thresholds.latencyCriticalMs) {
      anomalies.push({
        type: TYPES.HIGH_LATENCY,
        severity: 'critical',
        detail: `Response time ${ms}ms exceeds critical threshold ${thresholds.latencyCriticalMs}ms`,
      });
    } else if (ms > thresholds.latencyMs) {
      anomalies.push({
        type: TYPES.HIGH_LATENCY,
        severity: 'high',
        detail: `Response time ${ms}ms exceeds threshold ${thresholds.latencyMs}ms`,
      });
    }
  }

  if (Number.isInteger(record && record.status_code)) {
    const code = record.status_code;
    if (code >= 500) {
      anomalies.push({
        type: TYPES.SERVER_ERROR,
        severity: 'critical',
        detail: `Server error, status code ${code}`,
      });
    } else if (code >= 400) {
      anomalies.push({
        type: TYPES.CLIENT_ERROR,
        severity: 'medium',
        detail: `Client error, status code ${code}`,
      });
    }
  }

  if (isNum(record && record.records_returned) && record.records_returned === 0) {
    anomalies.push({
      type: TYPES.NO_DATA,
      severity: 'high',
      detail: 'Zero records returned',
    });
  }

  return anomalies;
}

module.exports = { detectAnomalies, validateRecord, TYPES };
