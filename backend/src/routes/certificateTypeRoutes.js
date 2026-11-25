const express = require('express');
const { body, param } = require('express-validator');
const certificateTypeController = require('../controllers/certificateTypeController');
const { authenticateAdmin, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.use(authenticateAdmin);

const typeValidationRules = [
  body('name').trim().notEmpty().withMessage('Scope name is required.'),
  body('accreditation_status')
    .optional()
    .isIn(['EIAC', 'Non-EIAC'])
    .withMessage("Accreditation status must be 'EIAC' or 'Non-EIAC'."),
  handleValidationErrors
];

const SCOPE_MODIFY_ROLES = ['admin', 'certification_manager', 'examiner'];

router.get('/', certificateTypeController.listCertificateTypes);
router.get('/:id', [param('id').isInt().withMessage('Valid ID required.'), handleValidationErrors], certificateTypeController.getCertificateTypeById);
// Technical Coordinator (and all staff roles) may add certification scopes
router.post('/', typeValidationRules, certificateTypeController.createCertificateType);
// Editing or deactivating existing scopes requires non-coordinator privileges
router.put('/:id', requireRole(...SCOPE_MODIFY_ROLES), [param('id').isInt().withMessage('Valid ID required.'), ...typeValidationRules], certificateTypeController.updateCertificateType);
router.patch('/:id/toggle-status', requireRole(...SCOPE_MODIFY_ROLES), [param('id').isInt().withMessage('Valid ID required.'), handleValidationErrors], certificateTypeController.toggleCertificateTypeStatus);

module.exports = router;

