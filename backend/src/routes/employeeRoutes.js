const express = require('express');
const { body, param } = require('express-validator');
const employeeController = require('../controllers/employeeController');
const { authenticateAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.use(authenticateAdmin);

const employeeValidationRules = [
  body('name').trim().notEmpty().withMessage('Employee name is required.'),
  body('email').isEmail().withMessage('A valid email address is required.').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required.'),
  body('emirates_id')
    .trim()
    .matches(/^784-\d{4}-\d{7}-\d$/)
    .withMessage('Emirates ID must match standard UAE format: 784-YYYY-XXXXXXX-X.'),
  body('gender')
    .optional({ checkFalsy: true })
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other.'),
  body('date_of_birth')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Date of birth must be a valid date (YYYY-MM-DD).'),
  handleValidationErrors
];

router.get('/', employeeController.listEmployees);
router.get('/:id', [param('id').isInt().withMessage('Valid employee ID required.'), handleValidationErrors], employeeController.getEmployeeById);
router.post('/', employeeValidationRules, employeeController.createEmployee);
router.put('/:id', [param('id').isInt().withMessage('Valid employee ID required.'), ...employeeValidationRules], employeeController.updateEmployee);
router.patch('/:id/toggle-status', [param('id').isInt().withMessage('Valid employee ID required.'), handleValidationErrors], employeeController.toggleEmployeeStatus);
router.delete('/:id', [param('id').isInt().withMessage('Valid employee ID required.'), handleValidationErrors], employeeController.deleteEmployee);

module.exports = router;

