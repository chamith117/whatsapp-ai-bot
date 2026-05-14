const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/', orderController.getAll);
router.patch('/:id/status', orderController.updateStatus);

module.exports = router;
