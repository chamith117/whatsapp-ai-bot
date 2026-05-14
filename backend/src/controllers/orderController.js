const firebaseService = require('../services/firebaseService');

const orderController = {
  getAll: async (req, res) => {
    try {
      const orders = await firebaseService.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  updateStatus: async (req, res) => {
    try {
      const order = await firebaseService.updateOrderStatus(req.params.id, req.body.status);
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = orderController;
