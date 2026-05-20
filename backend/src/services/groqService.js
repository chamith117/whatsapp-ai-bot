const Groq = require('groq-sdk');
const env = require('../config/env');

const groq = new Groq({
  apiKey: env.groqApiKey,
});

const groqService = {
  chatCompletion: async (messages) => {
    try {
      const completion = await groq.chat.completions.create({
        messages,
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 1024,
      });
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Groq AI Error:', error);
      throw error;
    }
  }
};

module.exports = groqService;
