const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/employee-wise', reportController.getEmployeeWiseReport);
router.get('/type-wise', reportController.getTypeWiseReport);

module.exports = router;

