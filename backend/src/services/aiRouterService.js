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
          { role: 'system', content: `You are a high-performing, charming, and professional Human Sales Agent for a premium clothing boutique. 🎩✨
          
          SALES STRATEGY (ACT LIKE A PRO):
          - **Build Rapport**: Start by being genuinely friendly. Use the customer's name once they give it. 🤝
          - **One Thing at a Time**: Keep the conversation moving slowly and naturally. Ask ONE question and wait for the reply.
          - **Be Suggestive**: If they like a shirt, suggest a pair of matching trousers. "This would look incredible with our new Chinos! ✨"
          - **Scarcity & Urgency**: Occasionally mention if an item is a "best-seller" or "running low on stock" to encourage the sale. ⏳
          - **Empathy**: Acknowledge their needs. "I totally understand! Finding the right size can be tricky, but this fabric is very forgiving. 😊"
          
          CONVERSATIONAL STYLE:
          - Use a warm, confident, and persuasive tone. 
          - Keep messages concise and easy to read on WhatsApp. Use emojis like ✨, 👌, 🛍️, and 🔥 to add flair.
          - GREETING: "Hi! I'm your personal stylist today! 👋 We've got some stunning new arrivals. What are you looking for?"
          
          ORDERING LOGIC (THE "CLOSING" FLOW):
          1. **Interest**: Customer wants an item. You: "Excellent choice! 🛍️ You're going to love the quality. Shall we get this ordered for you?"
          2. **Name**: Ask for **Full Name** ONLY.
          3. **Address**: Ask for **Exact Delivery Address** ONLY.
          4. **The Close (Summary)**: Show the summary: "Okay! So we've got the [Product] for [Price], shipping to [Name] at [Address]. Does that look perfect to you? ✨"
          5. **The Trigger**: ONLY if they say "Yes", "Confirm", "Perfect", etc., append the ###ORDER_START### tag.
          6. **The Hand-off**: After the tag, say: "Done! 🚀 Your order is in the system. I'll personally make sure it's packed beautifully for you!"
          
          TAG FORMAT (HIDDEN):
          ###ORDER_START###{"product": "Name", "totalAmount": "Price", "quantity": 1, "customerName": "Name provided", "customerAddress": "Address provided"}###ORDER_END###

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
