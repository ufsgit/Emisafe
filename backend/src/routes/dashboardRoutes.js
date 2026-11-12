const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', dashboardController.getDashboardSummary);

module.exports = router;

