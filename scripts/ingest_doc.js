const path = require('path');
const dotenv = require('dotenv');
// Load env from backend FIRST
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const fs = require('fs');
const pdf = require('pdf-parse');
const pdfParse = typeof pdf === 'function' ? pdf : (pdf.default || pdf.PDFParse);
const pineconeService = require('../backend/src/services/pineconeService');

const PDF_PATH = path.join(__dirname, '../Doc/aura_thread_v2_updated.pdf');

const ingest = async () => {
  console.log(`Reading PDF: ${PDF_PATH}`);
  
  try {
    if (!fs.existsSync(PDF_PATH)) {
      console.error("PDF file not found!");
      return;
    }

    const buffer = fs.readFileSync(PDF_PATH);
    const dataBuffer = new Uint8Array(buffer);
    let text = "";
    try {
      const data = await pdfParse(dataBuffer);
      text = data.text || data;
    } catch (e) {
      if (typeof pdfParse === 'function' && e.message.includes('constructor')) {
        const instance = new pdfParse(dataBuffer);
        text = await instance.getText();
      } else {
        throw e;
      }
    }
    
    if (typeof text !== 'string') {
        // Fallback or further processing if text is still an object
        text = text.text || JSON.stringify(text);
    }
    console.log(`Extracted ${text.length} characters from PDF.`);

    // Split text into chunks
    const chunks = text.match(/[\s\S]{1,1000}/g) || [];
    console.log(`Split into ${chunks.length} chunks.`);

    const documents = chunks.map((chunk, index) => ({
      id: `aura-thread-${index}`,
      text: chunk,
      metadata: {
        source: 'aura_thread_v2_updated.pdf',
        text: chunk
      }
    }));

    console.log("Upserting to Pinecone (index: business-knowledge)...");
    await pineconeService.upsertDocuments('business-knowledge', documents);
    
    console.log("Ingestion completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Ingestion failed:", error);
    process.exit(1);
  }
};

ingest();
