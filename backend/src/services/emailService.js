const config = require('../config');
const logger = require('../utils/logger');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: { user: config.email.user, pass: config.email.pass },
    });
  }
  return transporter;
}

/** Optional feature: email a summary of new alerts. Never throws. */
async function sendAlertReport(alerts) {
  const { enabled, to, from, user, pass } = config.email;
  if (!enabled) return { sent: false, reason: 'disabled' };
  if (!to || !user || !pass) {
    logger.warn('Email enabled but SMTP settings are incomplete');
    return { sent: false, reason: 'not_configured' };
  }
  if (!alerts.length) return { sent: false, reason: 'no_alerts' };

  const lines = alerts.map((a) => `[${a.severity.toUpperCase()}] ${a.apiName}: ${a.message}`);
  try {
    await getTransporter().sendMail({
      from,
      to,
      subject: `API Monitor: ${alerts.length} new alert(s)`,
      text: `New anomalies detected:\n\n${lines.join('\n')}\n`,
    });
    logger.info(`Email report sent to ${to} (${alerts.length} alerts)`);
    return { sent: true };
  } catch (err) {
    logger.error(`Email send failed: ${err.message}`);
    return { sent: false, reason: 'error' };
  }
}

module.exports = { sendAlertReport };
