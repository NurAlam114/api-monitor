const express = require('express');
const monitorController = require('../controllers/monitorController');
const alertController = require('../controllers/alertController');
const validateMonitor = require('../middleware/validateMonitor');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

router.post('/monitor', validateMonitor, monitorController.monitor);
router.get('/alerts', alertController.getAlerts);
router.patch('/alerts/:id/resolve', alertController.resolveAlert);

module.exports = router;
