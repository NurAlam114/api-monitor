const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const requestLogger = require('./middleware/requestLogger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
