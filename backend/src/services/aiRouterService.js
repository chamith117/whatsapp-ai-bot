const groqService = require('./groqService');
const claudeService = require('./claudeService');
const pineconeService = require('./pineconeService');
const firebaseService = require('./firebaseService');
const whatsappService = require('./whatsappService');

const aiRouterService = {
  handleIncomingMessage: async (senderId, message) => {
    try {
      let responseText = "";

      if (message.type === 'text') {
        const userQuery = message.text.body;
        console.log(`Processing text message from ${senderId}: "${userQuery}"`);
        
        // 1. Search Knowledge Base (RAG) - With Fallback
        let contextString = "";
        try {
          console.log('Searching Pinecone...');
          const relevantContexts = await pineconeService.query('business-knowledge', userQuery);
          contextString = relevantContexts.map(m => m.metadata?.text || "").join('\n---\n');
          console.log(`Found ${relevantContexts.length} context chunks.`);
        } catch (ragError) {
          console.error('⚠️ RAG Error (skipping context):', ragError.message);
          contextString = "No specific context found.";
        }

        // 1b. Fetch Products from Inventory
        let productString = "";
        try {
          console.log('Fetching Products...');
          const products = await firebaseService.getProducts();
          productString = products.map(p => `- ${p.name}: ${p.description} (Price: ${p.price})`).join('\n');
          console.log(`Found ${products.length} products.`);
        } catch (prodError) {
          console.error('⚠️ Product Fetch Error:', prodError.message);
        }
        
        // 2. Get Chat History - With Fallback
        let history = [];
        try {
          console.log('Fetching Chat History...');
          history = await firebaseService.getChatHistory(senderId);
        } catch (dbError) {
          console.error('⚠️ Database Error (skipping history):', dbError.message);
        }
        
        // 3. Prepare Prompt for Groq
        const messages = [
          { role: 'system', content: `You are a helpful AI WhatsApp Business Assistant. Use the following context to answer customer questions. If the answer is not in the context, use your general knowledge but mention you are not sure. Be concise and professional.\n\nBUSINESS KNOWLEDGE (from PDF):\n${contextString}\n\nCURRENT PRODUCT CATALOG:\n${productString}` },
          ...history.map(msg => ({ role: msg.from === 'user' ? 'user' : 'assistant', content: msg.text })),
          { role: 'user', content: userQuery }
        ];

        // 4. Generate AI Reply
        console.log('Calling Groq API...');
        responseText = await groqService.chatCompletion(messages);
        console.log('Groq Response Generated.');

        // 5. Save History - Background
        firebaseService.saveChatMessage(senderId, { from: 'user', text: userQuery, timestamp: new Date().toISOString() }).catch(e => console.error('Save error:', e));
        firebaseService.saveChatMessage(senderId, { from: 'bot', text: responseText, timestamp: new Date().toISOString() }).catch(e => console.error('Save error:', e));

      }
 else if (message.type === 'image') {
        const mediaId = message.image.id;
        const mediaUrl = await whatsappService.getMediaUrl(mediaId);
        const base64Image = await whatsappService.downloadMedia(mediaUrl);

        // 1. Analyze with Claude
        const analysis = await claudeService.analyzeImage(base64Image);
        
        // 2. Match products in Firebase (Simple search for now)
        const products = await firebaseService.getProducts();
        // This is a placeholder for actual matching logic
        responseText = `I see you sent an image. Claude says: ${analysis}\n\nI'm checking our catalog for similar items...`;
        
        // Send a followup or combine
        await firebaseService.saveChatMessage(senderId, { from: 'user', text: "[Sent an image]", timestamp: new Date().toISOString() });
        await firebaseService.saveChatMessage(senderId, { from: 'bot', text: responseText, timestamp: new Date().toISOString() });
      }

      // Send response back to WhatsApp
      if (responseText) {
        await whatsappService.sendMessage(senderId, responseText);
      }

    } catch (error) {
      console.error('AI Router Error:', error);
      await whatsappService.sendMessage(senderId, "I'm sorry, I'm having some trouble processing your request right now.");
    }
  }
};

module.exports = aiRouterService;
