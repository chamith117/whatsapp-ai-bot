const firebaseService = require('../services/firebaseService');

const chatController = {
  getAll: async (req, res) => {
    try {
      const chats = await firebaseService.getAllChats();
      res.json(chats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getOne: async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await firebaseService.getChatHistory(id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = chatController;
