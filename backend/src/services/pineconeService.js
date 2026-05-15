const { Pinecone } = require('@pinecone-database/pinecone');
const env = require('../config/env');
const { pipeline } = require('@xenova/transformers');

const pc = new Pinecone({
  apiKey: env.pineconeApiKey,
});

let embedder;
const getEmbedder = async () => {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
};

const pineconeService = {
  generateEmbeddings: async (text) => {
    const extractor = await getEmbedder();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  },

  upsertDocuments: async (indexName, documents) => {
    const index = pc.index(indexName);
    const vectors = await Promise.all(documents.map(async (doc) => {
      const values = await pineconeService.generateEmbeddings(doc.text);
      return {
        id: doc.id,
        values,
        metadata: doc.metadata
      };
    }));
    console.log(`Upserting ${vectors.length} vectors to Pinecone...`);
    if (vectors.length > 0) {
    const vectorsToUpsert = vectors.map(v => ({ id: v.id, values: v.values, metadata: v.metadata }));
    console.log("Upserting records:", JSON.stringify(vectorsToUpsert).slice(0, 100) + "...");
    await index.upsert({ records: vectorsToUpsert });
    } else {
      console.warn("No vectors generated to upsert.");
    }
  },

  query: async (indexName, queryText, topK = 3) => {
    const index = pc.index(indexName);
    const queryVector = await pineconeService.generateEmbeddings(queryText);
    const queryResponse = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });
    return queryResponse.matches;
  },
  
  deleteByMetadata: async (indexName, filter) => {
    const index = pc.index(indexName);
    console.log(`Deleting vectors from Pinecone with filter:`, filter);
    await index.deleteMany({ filter });
    return true;
  }
};

module.exports = pineconeService;
