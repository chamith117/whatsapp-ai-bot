const { db, bucket } = require('../config/firebase');

const firebaseService = {
  // Products
  getProducts: async () => {
    const snapshot = await db.collection('products').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  getProduct: async (id) => {
    const doc = await db.collection('products').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },
  createProduct: async (data) => {
    const docRef = await db.collection('products').add(data);
    return { id: docRef.id, ...data };
  },
  updateProduct: async (id, data) => {
    await db.collection('products').doc(id).update(data);
    return { id, ...data };
  },
  deleteProduct: async (id) => {
    await db.collection('products').doc(id).delete();
    return { id };
  },

  // Orders
  getOrders: async () => {
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  createOrder: async (data) => {
    const orderData = {
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const docRef = await db.collection('orders').add(orderData);
    return { id: docRef.id, ...orderData };
  },
  updateOrderStatus: async (id, status) => {
    const docRef = db.collection('orders').doc(id);
    await docRef.update({ status });
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  },
  getLatestOrder: async (whatsappId) => {
    const snapshot = await db.collection('orders')
      .where('whatsappId', '==', whatsappId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },
  cancelOrder: async (orderId) => {
    await db.collection('orders').doc(orderId).update({ status: 'cancelled' });
    return true;
  },

  // Chats/Sessions
  saveChatMessage: async (whatsappId, message) => {
    const chatRef = db.collection('chats').doc(whatsappId);
    const doc = await chatRef.get();
    
    if (!doc.exists) {
      await chatRef.set({
        whatsappId,
        messages: [message],
        updatedAt: new Date().toISOString()
      });
    } else {
      const messages = doc.data().messages || [];
      messages.push(message);
      // Keep only last 20 messages for context
      const trimmedMessages = messages.slice(-20);
      await chatRef.update({
        messages: trimmedMessages,
        updatedAt: new Date().toISOString()
      });
    }
  },
  getChatHistory: async (whatsappId) => {
    const doc = await db.collection('chats').doc(whatsappId).get();
    return doc.exists ? doc.data().messages : [];
  },

  // Knowledge Base Management
  getKnowledgeBase: async () => {
    const snapshot = await db.collection('knowledge_base').orderBy('uploadedAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  saveKnowledgeEntry: async (filename, stats, profile = 'Default') => {
    const docId = filename.replace(/[^a-zA-Z0-9]/g, '_');
    const data = {
      filename,
      profile,
      ...stats,
      uploadedAt: new Date().toISOString()
    };
    await db.collection('knowledge_base').doc(docId).set(data);
    return data;
  },
  deleteKnowledgeEntry: async (id) => {
    await db.collection('knowledge_base').doc(id).delete();
    return true;
  },
  
  // Business Profiles
  getActiveProfile: async () => {
    const doc = await db.collection('settings').doc('rag_config').get();
    return doc.exists ? doc.data().activeProfile : 'Default';
  },
  setActiveProfile: async (profile) => {
    await db.collection('settings').doc('rag_config').set({ activeProfile: profile }, { merge: true });
    return profile;
  }
};

module.exports = firebaseService;
