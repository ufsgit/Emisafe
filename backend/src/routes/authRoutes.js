const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateAdmin } = require('../middleware/auth');
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

module.exports = router;

