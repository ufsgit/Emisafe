const express = require('express');
const { param } = require('express-validator');
const certificateFormatController = require('../controllers/certificateFormatController');
const { authenticateAdmin, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.use(authenticateAdmin);

const idRule = [
  param('id').isInt().withMessage('Valid certificate format ID required.'),
  handleValidationErrors
];

// Everyone signed in may read the uploaded raw format.
router.get('/', certificateFormatController.listCertificateFormats);
// Only admins may upload or remove the raw format.
router.post('/', requireRole('admin'), certificateFormatController.uploadCertificateFormat);
router.delete('/:id', idRule, requireRole('admin'), certificateFormatController.deleteCertificateFormat);

module.exports = router;
