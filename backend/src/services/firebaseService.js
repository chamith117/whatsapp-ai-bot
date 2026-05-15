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
  }
};

module.exports = firebaseService;
