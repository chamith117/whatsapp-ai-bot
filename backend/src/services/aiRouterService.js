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
        
        // 1. Search Knowledge Base (RAG) - With Business Profile Filtering
        let contextString = "";
        try {
          console.log('Fetching active business profile...');
          const activeProfile = await firebaseService.getActiveProfile();
          console.log(`Active Profile: ${activeProfile}`);

          console.log('Searching Pinecone with profile filter...');
          const relevantContexts = await pineconeService.query(
            'business-knowledge', 
            userQuery, 
            3, 
            { profile: activeProfile } // Filter by active business
          );
          
          contextString = relevantContexts.map(m => m.metadata?.text || "").join('\n---\n');
          console.log(`Found ${relevantContexts.length} context chunks for profile: ${activeProfile}`);
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
        
        // 1c. Fetch Latest Order Status
        let latestOrderInfo = "No active orders found.";
        try {
          const latestOrder = await firebaseService.getLatestOrder(senderId);
          if (latestOrder) {
            latestOrderInfo = `Latest Order: ${latestOrder.product} | Status: ${latestOrder.status} | ID: ${latestOrder.id}`;
          }
        } catch (orderError) {
          console.error('⚠️ Error fetching latest order:', orderError.message);
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
          4. **The Close (Summary)**: Show the summary: "Okay! So we've got the [Product] for [Price], shipping to [Name] at [Address]. Shall I confirm your order now? ✨"
          5. **The Trigger**: ONLY if they say "Yes", "Confirm", "Perfect", etc., append the ###ORDER_START### tag.
          6. **The Hand-off**: After the tag, say: "Done! 🚀 Your order is in the system. I'll personally make sure it's packed beautifully for you!"
          
          CANCELLATION & CHANGE LOGIC:
          - If a customer wants to **CANCEL** their order:
            - Check the "CURRENT ORDER STATUS" below.
            - If status is "pending": You CAN cancel it. Tell them "No problem! I've cancelled that for you. 🗑️" and append the tag: ###CANCEL_ORDER###{"id": "ORDER_ID_HERE"}###
            - If status is "shipped" or "delivered": You CANNOT cancel it. Explain: "I'm so sorry, but your order has already been shipped 🚚 and is on its way to you! We can't cancel it at this stage. 😊"
          - If a customer wants to **CHANGE** their order (e.g., different size, color, or item):
            - Check the "CURRENT ORDER STATUS" below.
            - If status is "pending": Tell them "I'd love to help you change that! ✨ Please contact our support team on WhatsApp at **+94 77 123 4567** 📲 and they will update it for you immediately. 🤝"
            - If status is "shipped" or "delivered": Tell them "I'm so sorry, but since your order is already shipped 🚚, it's a bit harder to make changes. However, please contact our support team at **+94 77 123 4567** 📲 and we will see what we can do to help you! 😊"
          
          TAG FORMAT (HIDDEN):
          ###ORDER_START###{"product": "Name", "totalAmount": "Price", "quantity": 1, "customerName": "Name provided", "customerAddress": "Address provided"}###ORDER_END###

          BUSINESS KNOWLEDGE (from PDF):
          ${contextString}
          
          CURRENT PRODUCT CATALOG:
          ${productString}
          
          CURRENT ORDER STATUS FOR THIS CUSTOMER:
          ${latestOrderInfo}` },
          ...history.filter(msg => msg && msg.text).map(msg => ({ 
            role: msg.from === 'user' ? 'user' : 'assistant', 
            content: String(msg.text) 
          })),
          { role: 'user', content: userQuery || "Hello" }
        ];

        // 4. Generate AI Reply
        console.log('Calling Groq API...');
        responseText = await groqService.chatCompletion(messages);
        
        // 5. Detect and Process Orders/Cancellations
        const orderMatch = responseText.match(/###ORDER_START###([\s\S]*?)###ORDER_END###/);
        if (orderMatch) {
          try {
            let orderJson = orderMatch[1].trim();
            orderJson = orderJson.replace(/^```json/, '').replace(/```$/, '').trim();
            const orderData = JSON.parse(orderJson);
            await firebaseService.createOrder({
              ...orderData,
              customerPhone: senderId,
              whatsappId: senderId,
              status: 'pending'
            });
            console.log('✅ Order created.');
          } catch (e) {
            console.error('❌ Order Parse Error:', e.message);
          }
        }

        const cancelMatch = responseText.match(/###CANCEL_ORDER###([\s\S]*?)(?:###|$)/);
        if (cancelMatch) {
          try {
            let cancelJson = cancelMatch[1].trim();
            cancelJson = cancelJson.replace(/^```json/, '').replace(/```$/, '').trim();
            const cancelData = JSON.parse(cancelJson);
            let orderId = cancelData.id;
            if (!orderId || orderId === "ORDER_ID_HERE") {
              const latest = await firebaseService.getLatestOrder(senderId);
              if (latest && latest.status === 'pending') orderId = latest.id;
            }
            if (orderId && orderId !== "ORDER_ID_HERE") await firebaseService.cancelOrder(orderId);
          } catch (e) {
            console.error('❌ Cancel Parse Error:', e.message);
          }
        }

        // 6. FINAL CLEANUP: Aggressively remove ALL technical tags and leftovers
        responseText = responseText
          // Remove complete tags
          .replace(/###ORDER_START###[\s\S]*?###ORDER_END###/g, '')
          .replace(/###CANCEL_ORDER###[\s\S]*?###/g, '')
          // Remove stray/incomplete tags just in case
          .replace(/###ORDER_START###[\s\S]*/g, '') // Remove everything after a stray start tag
          .replace(/###CANCEL_ORDER###[\s\S]*/g, '') // Remove everything after a stray cancel tag
          .replace(/###ORDER_END###/g, '')
          .replace(/###/g, '')
          .replace(/```json[\s\S]*?```/g, '')
          .replace(/```[\s\S]*?```/g, '') // Remove any other code blocks
          .trim();

        // 7. Save History
        if (userQuery) {
          firebaseService.saveChatMessage(senderId, { from: 'user', text: userQuery, timestamp: new Date().toISOString() }).catch(e => console.error('Save error:', e));
        }
        if (responseText) {
          firebaseService.saveChatMessage(senderId, { from: 'bot', text: responseText, timestamp: new Date().toISOString() }).catch(e => console.error('Save error:', e));
        }

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
