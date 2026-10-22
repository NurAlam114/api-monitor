const { processBatch } = require('../services/monitorService');
const { sendAlertReport } = require('../services/emailService');
const logger = require('../utils/logger');

const MAX_BATCH = 500;

exports.monitor = async (req, res, next) => {
  try {
    const records = req.body;
    logger.info(`POST /monitor received ${Array.isArray(records) ? records.length : 0} record(s)`);

    const { summary, createdAlerts, errors } = await processBatch(records);

    // Optional email, fire-and-forget so it never delays the response
    const important = createdAlerts.filter((a) => a.severity === 'critical' || a.severity === 'high');
    sendAlertReport(important).catch(() => {});

    res.status(201).json({ success: true, summary, alerts: createdAlerts, errors });
  } catch (err) {
    next(err);
  }
};

exports.MAX_BATCH = MAX_BATCH;
