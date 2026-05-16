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
      console.log(`📦 Updating order ${id} status to: ${status}`);
      
      const updatedOrder = await firebaseService.updateOrderStatus(id, status);
      console.log(`✅ Order updated in DB. Customer Phone: ${updatedOrder.customerPhone}`);
      
      // Notify customer if shipped or delivered
      if ((status === 'shipped' || status === 'delivered') && updatedOrder.customerPhone) {
        let message = '';
        if (status === 'shipped') {
          message = `Great news! 🚚 Your order for *${updatedOrder.product}* has been shipped. You should receive it within the next 7 days. Thank you for shopping with us!`;
        } else {
          message = `Your order for *${updatedOrder.product}* has been delivered! 📦 We hope you love it. Thank you for choosing us!`;
        }
        
        console.log(`📲 Sending WhatsApp notification to ${updatedOrder.customerPhone}...`);
        await whatsappService.sendMessage(updatedOrder.customerPhone, message);
        console.log('✅ Notification sent successfully!');
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('❌ Order Status Update Error:', error);
      res.status(500).json({ error: error.message });
    }
  },
  deleteOrder: async (req, res) => {
    try {
      const { id } = req.params;
      await firebaseService.deleteOrder(id);
      res.json({ message: 'Order deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = orderController;
