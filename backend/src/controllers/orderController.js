const firebaseService = require('../services/firebaseService');
const whatsappService = require('../services/whatsappService');

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
      const { id } = req.params;
      const { status } = req.body;
      
      const updatedOrder = await firebaseService.updateOrderStatus(id, status);
      
      // Notify customer if shipped or delivered
      if ((status === 'shipped' || status === 'delivered') && updatedOrder.customerPhone) {
        let message = '';
        if (status === 'shipped') {
          message = `Great news! 🚚 Your order for *${updatedOrder.product}* has been shipped. You should receive it within the next 7 days. Thank you for shopping with us!`;
        } else {
          message = `Your order for *${updatedOrder.product}* has been delivered! 📦 We hope you love it. Thank you for choosing us!`;
        }
        
        await whatsappService.sendMessage(updatedOrder.customerPhone, message).catch(err => {
          console.error('Failed to send status update WhatsApp:', err);
        });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = orderController;
