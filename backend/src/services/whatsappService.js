const axios = require('axios');
const env = require('../config/env');

const whatsappService = {
  sendMessage: async (to, text) => {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v21.0/${env.whatsappPhoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${env.whatsappToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('WhatsApp Send Error:', error.response ? error.response.data : error.message);
      throw error;
    }
  },

  sendImage: async (to, imageUrl, caption) => {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v21.0/${env.whatsappPhoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'image',
          image: { 
            link: imageUrl,
            caption: caption
          },
        },
        {
          headers: {
            Authorization: `Bearer ${env.whatsappToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('WhatsApp Send Image Error:', error.response ? error.response.data : error.message);
      throw error;
    }
  },

  getMediaUrl: async (mediaId) => {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/${mediaId}`,
        {
          headers: {
            Authorization: `Bearer ${env.whatsappToken}`,
          },
        }
      );
      return response.data.url;
    } catch (error) {
      console.error('WhatsApp Media URL Error:', error.response ? error.response.data : error.message);
      throw error;
    }
  },

  downloadMedia: async (url) => {
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${env.whatsappToken}`,
        },
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
      console.error('WhatsApp Media Download Error:', error.message);
      throw error;
    }
  }
};

module.exports = whatsappService;
