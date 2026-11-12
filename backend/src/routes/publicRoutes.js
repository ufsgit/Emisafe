const express = require('express');
const { param } = require('express-validator');
const publicController = require('../controllers/publicController');
const { publicVerificationLimiter } = require('../middleware/rateLimiter');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.get(
  '/verify/:certificateNumber',
  publicVerificationLimiter,
  [
    param('certificateNumber').trim().notEmpty().withMessage('Certificate number is required.'),
    handleValidationErrors
  ],
  publicController.verifyCertificate
);

module.exports = router;

