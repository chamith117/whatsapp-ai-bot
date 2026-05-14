const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: process.env.PORT || 3000,
  groqApiKey: process.env.GROQ_API_KEY,
  claudeApiKey: process.env.CLAUDE_API_KEY,
  pineconeApiKey: process.env.PINECONE_API_KEY,
  whatsappToken: process.env.WHATSAPP_TOKEN,
  whatsappPhoneId: process.env.WHATSAPP_PHONE_ID,
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n') 
    : '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

module.exports = env;
