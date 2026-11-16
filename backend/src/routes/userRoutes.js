const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticateAdmin, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

// Users management is restricted to admins
router.use(authenticateAdmin, requireRole('admin'));

const idRules = [param('id').isInt().withMessage('Valid user ID required.'), handleValidationErrors];

const createUserRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('A valid email address is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
  body('role')
    .isIn(['admin', 'certification_manager', 'examiner'])
    .withMessage('Role must be admin, certification_manager or examiner.'),
  handleValidationErrors
];

const updateUserRules = [
  ...idRules,
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('email').optional().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
  body('password').optional().notEmpty().withMessage('Password cannot be empty.'),
  body('role')
    .optional()
    .isIn(['admin', 'certification_manager', 'examiner'])
    .withMessage('Role must be admin, certification_manager or examiner.'),
  handleValidationErrors
];

router.get('/', userController.listUsers);
router.post('/', createUserRules, userController.createUser);
router.patch('/:id', updateUserRules, userController.updateUser);

module.exports = router;
