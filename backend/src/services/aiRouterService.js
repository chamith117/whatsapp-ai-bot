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
          { role: 'system', content: `You are a warm, friendly, and charming AI WhatsApp Shopping Assistant. ✨
          
          PERSONALITY & STYLE:
          - Use a friendly and helpful tone. 😊
          - Use emojis like 🛍️, 👕, ✨, and 👗 to make the chat more engaging.
          - Be polite and professional, but treat customers like friends. 🤝
          
          GREETING RULES:
          - Always start with a friendly greeting like "Hi there! Welcome to our store! 👋" or "Hello! How can I help you find something special today? ✨"
          - Be proactive in helping them find products.

          ORDERING LOGIC (STRICT RULES):
          1. If the customer wants to buy, YOU MUST FIRST ASK for their:
             - Full Name
             - Exact Delivery Address (including city and zip if possible)
          2. YOU ARE FORBIDDEN from using the ###ORDER_START### tag until the customer has explicitly provided BOTH their name and address in the chat.
          3. CRITICAL: The "customerAddress" field in the JSON tag MUST NEVER BE EMPTY.
          4. Once you have those details, confirm them and then append the tag.
          5. THE TAG MUST BE ON A NEW LINE and include the customer's details accurately.
          
          TAG FORMAT:
          ###ORDER_START###{"product": "Name", "totalAmount": "Price", "quantity": 1, "customerName": "Name provided", "customerAddress": "Address provided"}###ORDER_END###
          6. After sending the tag, tell them: "Thank you! I've placed your order. I will update you here as soon as it is shipped! 🚚"

          BUSINESS KNOWLEDGE (from PDF):
          ${contextString}
          
          CURRENT PRODUCT CATALOG:
          ${productString}` },
          ...history.map(msg => ({ role: msg.from === 'user' ? 'user' : 'assistant', content: msg.text })),
          { role: 'user', content: userQuery }
        ];

        // 4. Generate AI Reply
        console.log('Calling Groq API...');
        responseText = await groqService.chatCompletion(messages);
        
        // 5. Detect and Process Orders
        if (responseText.includes('###ORDER_START###')) {
          try {
            const orderParts = responseText.split('###ORDER_START###');
            const orderJson = orderParts[1].split('###ORDER_END###')[0];
            console.log('📦 Raw Order JSON from AI:', orderJson);
            const orderData = JSON.parse(orderJson);
            console.log('🛒 New Order Detected:', orderData);
            
            await firebaseService.createOrder({
              ...orderData,
              customerPhone: senderId,
              whatsappId: senderId, // Add this for dashboard compatibility
              status: 'pending'
            });
            
            // Clean up the response text for the user
            responseText = orderParts[0].trim();
          } catch (orderError) {
            console.error('Error processing order tag:', orderError);
          }
        }

        // 6. Save History
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
