const express = require('express');
const { body, param } = require('express-validator');
const certificateTypeController = require('../controllers/certificateTypeController');
const { authenticateAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.use(authenticateAdmin);

const typeValidationRules = [
  body('name').trim().notEmpty().withMessage('Certificate type name is required.'),
  body('category').optional().trim(),
  body('description').optional().trim(),
  body('scope').optional().trim(),
  handleValidationErrors
];

router.get('/', certificateTypeController.listCertificateTypes);
router.get('/:id', [param('id').isInt().withMessage('Valid ID required.'), handleValidationErrors], certificateTypeController.getCertificateTypeById);
router.post('/', typeValidationRules, certificateTypeController.createCertificateType);
router.put('/:id', [param('id').isInt().withMessage('Valid ID required.'), ...typeValidationRules], certificateTypeController.updateCertificateType);
router.patch('/:id/toggle-status', [param('id').isInt().withMessage('Valid ID required.'), handleValidationErrors], certificateTypeController.toggleCertificateTypeStatus);

module.exports = router;

