const mongoose = require('mongoose');
const Alert = require('../models/Alert');

const SEVERITIES = ['critical', 'high', 'medium'];

exports.getAlerts = async (req, res, next) => {
  try {
    const { severity, apiName, status = 'active' } = req.query;
    const filter = {};

    if (status !== 'all') filter.status = status === 'resolved' ? 'resolved' : 'active';
    if (severity && SEVERITIES.includes(severity)) filter.severity = severity;
    if (apiName) filter.apiName = String(apiName);

    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(500).lean();

    const counts = { total: alerts.length, critical: 0, high: 0, medium: 0 };
    alerts.forEach((a) => {
      counts[a.severity] += 1;
    });

    res.json({ success: true, count: alerts.length, counts, alerts });
  } catch (err) {
    next(err);
  }
};

exports.resolveAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid alert id' });
    }
    const alert = await Alert.findByIdAndUpdate(
      id,
      { status: 'resolved', resolvedAt: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, alert });
  } catch (err) {
    next(err);
  }
};
