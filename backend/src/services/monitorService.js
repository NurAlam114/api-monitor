const Alert = require('../models/Alert');
const { detectAnomalies } = require('./anomalyDetector');
const { generateAlertMessage } = require('./aiService');
const logger = require('../utils/logger');

/**
 * Process one API record: detect, generate message, store.
 * One alert is stored per record (covering all its anomalies),
 * using the most severe anomaly as the primary type.
 */
const SEVERITY_RANK = { critical: 3, high: 2, medium: 1 };

async function processRecord(record) {
  const anomalies = detectAnomalies(record);
  const apiName = (record && record.api_name) || 'UnknownAPI';

  if (!anomalies.length) {
    logger.info(`${apiName} healthy`);
    return { apiName, healthy: true, alert: null, deduplicated: false };
  }

  const primary = [...anomalies].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
  )[0];

  logger.warn(`${apiName} anomalies: ${anomalies.map((a) => a.type).join(', ')}`);

  // Dedup: skip if an identical active alert already exists
  const existing = await Alert.findOne({
    apiName,
    anomalyType: primary.type,
    severity: primary.severity,
    status: 'active',
  });
  if (existing) {
    logger.info(`Duplicate active alert for ${apiName}/${primary.type}, skipped`);
    return { apiName, healthy: false, alert: existing, deduplicated: true };
  }

  const { message, aiGenerated } = await generateAlertMessage(record || {}, anomalies);

  const alert = await Alert.create({
    apiName,
    anomalyType: primary.type,
    severity: primary.severity,
    message,
    aiGenerated,
    rawData: { record, anomalies },
  });

  return { apiName, healthy: false, alert, deduplicated: false };
}

/** Batch process; one failing record never breaks the rest. */
async function processBatch(records) {
  const settled = await Promise.allSettled(records.map(processRecord));

  const summary = {
    processed: records.length,
    healthy: 0,
    anomaliesFound: 0,
    alertsCreated: 0,
    duplicatesSkipped: 0,
    errors: 0,
  };
  const createdAlerts = [];
  const errors = [];

  settled.forEach((res, i) => {
    if (res.status === 'rejected') {
      summary.errors += 1;
      errors.push({ index: i, error: res.reason && res.reason.message });
      logger.error(`Record ${i} failed: ${res.reason && res.reason.message}`);
      return;
    }
    const r = res.value;
    if (r.healthy) {
      summary.healthy += 1;
      return;
    }
    summary.anomaliesFound += 1;
    if (r.deduplicated) summary.duplicatesSkipped += 1;
    else {
      summary.alertsCreated += 1;
      createdAlerts.push(r.alert);
    }
  });

  return { summary, createdAlerts, errors };
}

module.exports = { processRecord, processBatch };
