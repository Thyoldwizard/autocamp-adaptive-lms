const { NODE_ENV } = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const isProd = NODE_ENV === 'production';

  if (!err.isOperational) {
    console.error('[unhandled error]', err);
  }

  res.status(statusCode).json({
    error: {
      message: err.isOperational ? err.message : 'Internal server error',
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
