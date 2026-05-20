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
          let filter = activeProfile === 'Default' ? undefined : { profile: activeProfile };
          let relevantContexts = await pineconeService.query(
            'business-knowledge', 
            userQuery, 
            3, 
            filter
          );
          
          if (relevantContexts.length === 0 && filter) {
            console.log("No specific contexts found for profile, falling back to global search...");
            relevantContexts = await pineconeService.query(
              'business-knowledge', 
              userQuery, 
              3, 
              undefined
            );
          }
          
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

        // 1d. Fetch Customer Profile (Loyalty & Discounts)
        let customerInfo = "Loyalty Profile: New customer.";
        let activeDiscount = 0;
        try {
          const customer = await firebaseService.getCustomer(senderId);
          if (customer) {
            activeDiscount = customer.discount || 0;
            customerInfo = `Loyalty Profile: ${customer.orderCount} past orders. Available Discount: ${activeDiscount}%`;
          }
        } catch (custError) {
          console.error('⚠️ Error fetching customer profile:', custError.message);
        }
        
        // 3. Prepare Prompt for Groq
                 { role: 'system', content: `You are a helpful, professional, and natural Human Sales Assistant for a premium clothing boutique. 

          CONVERSATIONAL STYLE (TALK LIKE A REAL HUMAN):
          - Talk naturally, casually, and politely—just like a store owner messaging a customer on WhatsApp.
          - Be brief. Keep your messages short (1-2 sentences maximum). Do not send long blocks of text.
          - Use emojis very sparingly. Use at most 1-2 emojis per message, and only if it feels natural. Avoid emoji spam (do not use ✨, 👌, 🔥, 🎩 in every sentence).
          - Never repeat standard greetings (e.g. if they say "hi" multiple times, don't repeat your long intro).
          - Be friendly, build rapport, and ask ONE clear question at a time. Wait for their reply before moving forward.
          
          SALES FLOW & ORDERING LOGIC (THE "CLOSING" FLOW):
          1. **Interest**: Customer wants to buy an item. You: "Great choice! Shall we get this ordered for you?"
          2. **Name**: Ask for their **Full Name** only.
          3. **Address**: Ask for their **Exact Delivery Address** only.
          4. **The Close (Summary)**: Show the order details and the final price.
             *CRITICAL DISCOUNT RULE*: Look at the "CUSTOMER LOYALTY PROFILE" below. If they have an active discount (e.g., 10%), calculate the final price manually and show it to them. Example: "Since you're a returning customer, you get 10% off! Your total is now [Discounted Price]. Shall I confirm?"
          5. **The Trigger**: ONLY if they explicitly say "Yes", "Confirm", "Perfect", etc., output the order tag:
             ###ORDER_START###{"product": "Name", "totalAmount": "Discounted Price", "quantity": 1, "customerName": "Name", "customerAddress": "Address"}###ORDER_END###
          6. **The Hand-off**: Say: "Awesome! I've placed the order in our system. I'll make sure it's packed beautifully for you."
          
          CANCELLATION & CHANGE LOGIC:
          - If they want to **CANCEL** their order:
            - Check the "CURRENT ORDER STATUS" below.
            - If status is "pending": You can cancel it. Say: "No problem, I've cancelled that order for you." and output: ###CANCEL_ORDER###{"id": "ORDER_ID"}###
            - If status is "shipped" or "delivered": You cannot cancel it. Explain: "I'm sorry, but your order has already been shipped and is on its way, so we cannot cancel it at this stage."
          - If they want to **CHANGE** their order:
            - Tell them: "I'd love to help you change that! Please message our support team on WhatsApp at +94 77 123 4567 and they will update it for you immediately."
          
          BUSINESS KNOWLEDGE (from PDF):
          ${contextString}
          
          CURRENT PRODUCT CATALOG:
          ${productString}
          
          CUSTOMER LOYALTY PROFILE:
          ${customerInfo}

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
        const cancelMatch = responseText.match(/###CANCEL_ORDER###([\s\S]*?)(?:###|$)/);

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
        } else if (cancelMatch) {
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
