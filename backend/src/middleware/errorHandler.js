const { NODE_ENV } = require('../config/env');
const logger = require('../lib/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const isProd = NODE_ENV === 'production';

  if (!err.isOperational) {
    logger.error('unhandled error', {
      requestId: req.requestId,
      message: err.message,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    error: {
      message: err.isOperational ? err.message : 'Internal server error',
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
