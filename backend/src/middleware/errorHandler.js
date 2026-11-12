const config = require('../config/env');

function errorHandler(err, req, res, next) {
  console.error('[Error]', err);

  const statusCode = err.status || err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || 'Internal Server Error'
  };

  if (config.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  errorHandler
};

