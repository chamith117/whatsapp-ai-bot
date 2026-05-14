const groqService = require('../services/groqService');
const pineconeService = require('../services/pineconeService');
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
  
  uploadKnowledge: async (req, res) => {
    try {
      if (!req.file) return res.status(400).send('No file uploaded.');
      
      const dataBuffer = req.file.buffer;
      const data = await pdfParse(dataBuffer);
      
      // Split text into chunks (simple split for now)
      const text = data.text;
      const chunks = text.match(/[\s\S]{1,1000}/g) || [];
      
      const documents = chunks.map((chunk, index) => ({
        id: `${req.file.originalname}-${index}`,
        text: chunk,
        metadata: {
          filename: req.file.originalname,
          text: chunk
        }
      }));

      await pineconeService.upsertDocuments('business-knowledge', documents);
      
      res.json({ message: 'Knowledge base updated successfully', chunks: chunks.length });
    } catch (error) {
      console.error('RAG Upload Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = aiController;
