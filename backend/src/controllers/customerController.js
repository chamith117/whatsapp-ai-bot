const firebaseService = require('../services/firebaseService');
const whatsappService = require('../services/whatsappService');

const customerController = {
  getAll: async (req, res) => {
    try {
      const customers = await firebaseService.getAllCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  
  applyDiscount: async (req, res) => {
    try {
      const { id } = req.params;
      const { discount } = req.body;
      
      await firebaseService.updateCustomerDiscount(id, discount);
      res.json({ message: 'Discount applied successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  sendDiscountMessage: async (req, res) => {
    try {
      const { id } = req.params;
      const { discount } = req.body;
      
      const message = `🎉 Good news! As a thank you for being a repeat customer, we've applied a special **${discount}% discount** to your account. 🎁\n\nYour next order will automatically get this discount applied at checkout. Let me know if you want to see our latest collections! ✨`;
      
      await whatsappService.sendMessage(id, message);
      res.json({ message: 'Discount message sent successfully.' });
    } catch (error) {
      console.error('Error sending discount message:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = customerController;
