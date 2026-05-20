const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/', customerController.getAll);
router.post('/:id/discount', customerController.applyDiscount);
router.post('/:id/send-message', customerController.sendDiscountMessage);

module.exports = router;
