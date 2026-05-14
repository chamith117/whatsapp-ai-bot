const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

const anthropic = new Anthropic({
  apiKey: env.claudeApiKey,
});

const claudeService = {
  analyzeImage: async (imageUrl, prompt = "What is this product? Identify style and type.") => {
    if (!env.claudeApiKey || env.claudeApiKey === 'your_claude_key') {
      console.warn('Claude API Key missing. Skipping image analysis.');
      return "Image analysis is currently unavailable (API key missing).";
    }
    try {
      // In production, you might need to fetch the image and convert to base64 if it's a URL
      // For WhatsApp, we might get a temporary media URL
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: imageUrl, // Expecting base64 data here
                },
              },
              {
                type: "text",
                text: prompt
              }
            ],
          }
        ],
      });
      return response.content[0].text;
    } catch (error) {
      console.error('Claude Vision Error:', error);
      throw error;
    }
  }
};

module.exports = claudeService;
