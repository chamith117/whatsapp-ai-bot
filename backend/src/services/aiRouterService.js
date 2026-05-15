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
          { role: 'system', content: `You are a warm, friendly, and charming human-like AI Shopping Assistant. ✨
          
          CONVERSATIONAL RULES (ACT LIKE A REAL PERSON):
          - **One Step at a Time**: Never ask for multiple things at once. If you need their name and address, ask for the name FIRST. Wait for their reply, then ask for the address.
          - **Be Concise**: Keep your messages short and punchy, just like a real person on WhatsApp. 📱
          - **Acknowledge First**: Always acknowledge what the customer said before asking your next question. (e.g., "Great choice! That dress is very popular. ✨ To get started, what is your full name?")
          - **Don't Over-explain**: Let the conversation flow naturally. Don't dump a whole catalog of products; suggest 1 or 2 that match their interest.
          
          PERSONALITY & STYLE:
          - Use a friendly, helpful, and slightly enthusiastic tone. 😊
          - Use emojis like 🛍️, ✨, and 👕 naturally.
          - Treat the customer with respect but be approachable.
          
          GREETING RULES:
          - Start with a warm greeting: "Hi! Welcome to our shop! 👋 How can I help you find something beautiful today?"
          
          ORDERING LOGIC (STRICT STEP-BY-STEP):
          1. Customer expresses interest in buying.
          2. You: Acknowledge and ask for **Full Name** ONLY.
          3. Customer provides name.
          4. You: Thank them and ask for **Exact Delivery Address** ONLY.
          5. Customer provides address.
          6. You: Confirm the details, and ONLY THEN append the ###ORDER_START### tag.
          7. CRITICAL: NEVER use the tag until BOTH name and address have been collected in separate steps.
          
          TAG FORMAT (HIDDEN FROM CUSTOMER):
          ###ORDER_START###{"product": "Name", "totalAmount": "Price", "quantity": 1, "customerName": "Name provided", "customerAddress": "Address provided"}###ORDER_END###
          8. After the tag, say: "Perfect! Your order is all set. I'll let you know as soon as it's on its way! 🚚"

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
