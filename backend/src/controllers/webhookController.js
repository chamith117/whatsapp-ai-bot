const aiRouterService = require('../services/aiRouterService');
const env = require('../config/env');

const webhookController = {
  verifyWebhook: (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === env.webhookVerifyToken) {
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    }
  },

  handleWebhook: async (req, res) => {
    const body = req.body;

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const senderId = message.from;

        // Process message asynchronously
        aiRouterService.handleIncomingMessage(senderId, message).catch(err => {
          console.error('Error handling message:', err);
        });
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  }
};

module.exports = webhookController;
