const groqService = require('../services/groqService');
const pineconeService = require('../services/pineconeService');
const firebaseService = require('../services/firebaseService');
const pdf = require('pdf-parse');
const pdfParse = typeof pdf === 'function' ? pdf : (pdf.default || pdf.PDFParse);

const aiController = {
  chat: async (req, res) => {
    try {
      const { messages } = req.body;
      const response = await groqService.chatCompletion(messages);
      res.json({ response });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getProfile: async (req, res) => {
    try {
      const profile = await firebaseService.getActiveProfile();
      res.json({ profile });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  setProfile: async (req, res) => {
    try {
      const { profile } = req.body;
      await firebaseService.setActiveProfile(profile);
      res.json({ message: `Active business profile set to: ${profile}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  
  getKnowledgeList: async (req, res) => {
    try {
      const list = await firebaseService.getKnowledgeBase();
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteKnowledge: async (req, res) => {
    try {
      const { id, filename } = req.body;
      console.log(`🗑️ Deleting knowledge base entry: ${filename} (${id})`);
      
      // 1. Delete from Pinecone
      await pineconeService.deleteByMetadata('business-knowledge', { filename: filename });
      
      // 2. Delete from Firebase
      await firebaseService.deleteKnowledgeEntry(id);
      
      res.json({ message: 'Document removed from Knowledge Base' });
    } catch (error) {
      console.error('Delete Knowledge Error:', error);
      res.status(500).json({ error: error.message });
    }
  },
  
  uploadKnowledge: async (req, res) => {
    try {
      if (!req.file) return res.status(400).send('No file uploaded.');
      
      const { profile = 'Default' } = req.body;
      const filename = req.file.originalname;
      const dataBuffer = req.file.buffer;
      const data = await pdfParse(dataBuffer);
      
      const text = data.text;
      const chunks = text.match(/[\s\S]{1,1000}/g) || [];
      
      const documents = chunks.map((chunk, index) => ({
        id: `${filename}-${index}`,
        text: chunk,
        metadata: {
          filename: filename,
          profile: profile,
          text: chunk
        }
      }));

      await pineconeService.upsertDocuments('business-knowledge', documents);
      
      // Save registry entry in Firebase
      await firebaseService.saveKnowledgeEntry(filename, {
        chunks: chunks.length,
        size: req.file.size
      }, profile);
      
      res.json({ message: 'Knowledge base updated successfully', chunks: chunks.length, profile });
    } catch (error) {
      console.error('RAG Upload Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = aiController;
