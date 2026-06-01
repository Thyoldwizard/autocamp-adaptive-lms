'use strict';

const { randomUUID } = require('crypto');
const logger = require('../lib/logger');

function requestLogger(req, res, next) {
  req.requestId = randomUUID();
  const start = Date.now();

  res.on('finish', () => {
    logger.info('request', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
}

module.exports = requestLogger;
