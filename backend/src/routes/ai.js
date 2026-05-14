const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/chat', aiController.chat);
router.post('/rag/upload', upload.single('file'), aiController.uploadKnowledge);

module.exports = router;
