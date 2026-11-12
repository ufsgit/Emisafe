const rateLimit = require('express-rate-limit');

// Rate limiter for public certificate verification endpoint:
// Max 100 requests per 15 minutes per IP
const publicVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts from this IP. Please try again after 15 minutes.'
  }
});

// General API rate limiter
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  publicVerificationLimiter,
  generalApiLimiter
};

