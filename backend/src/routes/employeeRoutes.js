const express = require('express');
const { body, param } = require('express-validator');
const employeeController = require('../controllers/employeeController');
const { authenticateAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.use(authenticateAdmin);

const emiratesIdRule = body('emirates_id')
  .trim()
  .matches(/^784-\d{4}-\d{7}-\d$/)
  .withMessage('Emirates ID must match standard UAE format: 784-YYYY-XXXXXXX-X.');

const commonRules = [
  body('name').trim().notEmpty().withMessage('Candidate name is required.'),
  // email/phone/dob/nationality/designation are now optional
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim(),
  emiratesIdRule,
  body('gender')
    .optional({ checkFalsy: true })
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other.'),
  body('date_of_birth')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Date of birth must be a valid date (YYYY-MM-DD).')
];

// Photo is mandatory when creating a candidate (handler always runs last)
const createEmployeeRules = [
  ...commonRules,
  body('photo').notEmpty().withMessage('Photo is required.'),
  handleValidationErrors
];

const updateEmployeeRules = [...commonRules, handleValidationErrors];

const idRule = [param('id').isInt().withMessage('Valid candidate ID required.'), handleValidationErrors];

router.get('/', employeeController.listEmployees);
// NOTE: lookup must be registered BEFORE '/:id'
router.get('/lookup', employeeController.lookupEmployee);
router.get('/:id', idRule, employeeController.getEmployeeById);
router.post('/', createEmployeeRules, employeeController.createEmployee);
router.put('/:id', [...idRule, ...updateEmployeeRules], employeeController.updateEmployee);
router.patch('/:id/toggle-status', idRule, employeeController.toggleEmployeeStatus);
router.delete('/:id', idRule, employeeController.deleteEmployee);

// Candidate documents (multi-file base64 upload)
router.get('/:id/documents', idRule, employeeController.listDocuments);
router.post('/:id/documents', idRule, employeeController.uploadDocuments);
router.delete('/:id/documents/:docId', [
  param('id').isInt().withMessage('Valid candidate ID required.'),
  param('docId').isInt().withMessage('Valid document ID required.'),
  handleValidationErrors
], employeeController.deleteDocument);

module.exports = router;
