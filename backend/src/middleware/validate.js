const { validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));
    return res.status(422).json({
      success: false,
      message: 'Validation failed. Please check the submitted fields.',
      errors: errorDetails
    });
  }
  next();
}

module.exports = {
  handleValidationErrors
};

