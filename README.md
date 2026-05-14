# AI WhatsApp Business Assistant

A production-ready WhatsApp chatbot system with an AI chat engine (Groq), image recognition (Claude Vision), RAG knowledge base (Pinecone), and a modern admin dashboard (Next.js 14).

## 🚀 Features
- **AI Chat**: Powered by LLaMA 3.3 70B via Groq.
- **Vision**: Identify products in images using Claude 3.5 Sonnet.
- **RAG**: Upload business PDFs to train the bot on your specific policies/catalog.
- **Order Management**: Track and manage orders directly in the dashboard.
- **Analytics**: Monitor bot performance and customer intent.
- **Multi-language**: Built-in support for any language the LLM supports.

---

## 🛠️ Tech Stack
- **Backend**: Node.js, Express.js
- **Frontend**: Next.js 14 (App Router), TailwindCSS
- **Database/Auth**: Firebase (Firestore, Storage, Auth)
- **Vector DB**: Pinecone
- **AI Models**: Groq (LLaMA 3.3 70B), Anthropic (Claude 3.5 Sonnet), Xenova (Local Embeddings)
- **Messaging**: Meta WhatsApp Cloud API

---

## ⚙️ Setup Instructions

### 1. Backend Setup
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your API keys:
   - **Groq API Key**: From [Groq Console](https://console.groq.com/)
   - **Claude API Key**: From [Anthropic Console](https://console.anthropic.com/)
   - **Pinecone API Key**: From [Pinecone Console](https://www.pinecone.io/)
   - **WhatsApp Token/Phone ID**: From [Meta Developers Console](https://developers.facebook.com/)
   - **Firebase Admin Credentials**: Generate a private key JSON from Firebase Console > Project Settings > Service Accounts.
4. `npm start`

### 2. Admin Dashboard Setup
1. `cd admin-dashboard`
2. `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in your Firebase Client config.
4. `npm run dev`

### 3. WhatsApp Webhook Configuration
- Set your Webhook URL in Meta Console to: `https://your-backend-url.railway.app/webhook`
- Set the Verify Token to match the `WEBHOOK_VERIFY_TOKEN` in your backend `.env`.
- Subscribe to `messages` under WhatsApp Webhook fields.

---

## 📊 Seeding Example Data
To populate your dashboard with some initial products and orders, run:
```bash
node scripts/seed.js
```
*(Make sure your backend .env is configured first)*

---

## 🚢 Deployment
- **Backend**: Deploys automatically to **Railway** on push to `main`.
- **Frontend**: Deploys automatically to **Vercel** on push to `main`.

---


