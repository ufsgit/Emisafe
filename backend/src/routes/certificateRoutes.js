const express = require('express');
const { body, param } = require('express-validator');
const certificateController = require('../controllers/certificateController');
const { authenticateAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.use(authenticateAdmin);

const certValidationRules = [
  body('employee_id').isInt().withMessage('Valid employee must be selected.'),
  body('certificate_type_id').isInt().withMessage('Valid certificate type must be selected.'),
  body('certificate_number').trim().notEmpty().withMessage('Certificate number is required.'),
  body('issue_date').isISO8601().withMessage('Valid issue date is required (YYYY-MM-DD).'),
  body('expiry_date').isISO8601().withMessage('Valid expiry date is required (YYYY-MM-DD).'),
  body('status').isIn(['Pass', 'Fail']).withMessage('Status must be either Pass or Fail.'),
  body('description').optional().trim(),
  body('scope').optional().trim(),
  handleValidationErrors
];

router.get('/', certificateController.listCertificates);
router.get('/:id', [param('id').isInt().withMessage('Valid certificate ID required.'), handleValidationErrors], certificateController.getCertificateById);
router.post('/', certValidationRules, certificateController.createCertificate);
router.put('/:id', [param('id').isInt().withMessage('Valid certificate ID required.'), ...certValidationRules], certificateController.updateCertificate);
router.delete('/:id', [param('id').isInt().withMessage('Valid certificate ID required.'), handleValidationErrors], certificateController.deleteCertificate);

module.exports = router;

