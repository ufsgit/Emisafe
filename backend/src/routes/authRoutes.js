const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateAdmin, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email address is required.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
    handleValidationErrors
  ],
  authController.login
);

router.post('/logout', authController.logout);

router.get('/me', authenticateAdmin, authController.me);

// Only Administrator can view login timestamps (recorded for all users on login)
router.get('/login-history', authenticateAdmin, requireRole('admin'), authController.loginHistory);

module.exports = router;

