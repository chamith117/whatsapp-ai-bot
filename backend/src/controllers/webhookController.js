const aiRouterService = require('../services/aiRouterService');
const env = require('../config/env');

const processedMessages = new Set();
// Periodically clear cache every 10 minutes to avoid memory leaks
setInterval(() => {
  processedMessages.clear();
}, 10 * 60 * 1000);

const webhookController = {
  verifyWebhook: (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Incoming Webhook Verification Request:', { mode, token });
    console.log('Expected Token:', env.webhookVerifyToken);

    if (mode && token) {
      if (mode === 'subscribe' && token === env.webhookVerifyToken) {
        console.log('✅ WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      } else {
        console.error('❌ WEBHOOK_VERIFICATION_FAILED: Token mismatch');
        res.sendStatus(403);
      }
    } else {
      console.warn('⚠️ WEBHOOK_VERIFICATION_FAILED: Missing mode or token');
      res.sendStatus(400);
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
        const messageId = message.id;
        const senderId = message.from;

        if (processedMessages.has(messageId)) {
          console.log(`Duplicate WhatsApp message ID detected: ${messageId}. Skipping processing.`);
          res.sendStatus(200);
          return;
        }

        processedMessages.add(messageId);

        // Process message asynchronously to return 200 OK instantly to WhatsApp and prevent webhook retry storms
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
