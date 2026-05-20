const express = require('express');
const cors = require('cors');

const webhookRoutes = require('./routes/webhook');
const aiRoutes = require('./routes/ai');
const orderRoutes = require('./routes/orders');
const productRoutes = require('./routes/products');
const chatRoutes = require('./routes/chats');
const customerRoutes = require('./routes/customers');

const app = express();

app.use(cors());
// WhatsApp Webhook verification expects raw body or normal json
// However, some hooks might need raw body if checking signature. For now we use express.json()
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Root Route
app.get('/', (req, res) => {
  res.status(200).send('<h1>WhatsApp AI Bot Backend is Online</h1>');
});

// Health Check
app.get('/health', (req, res) => {
  console.log('✅ Health check request received!');
  res.status(200).json({ status: 'OK', message: 'Backend is running' });
});

// Register Routes
app.use('/webhook', webhookRoutes);
app.use('/ai', aiRoutes);
app.use('/orders', orderRoutes);
app.use('/products', productRoutes);
app.use('/chats', chatRoutes);
app.use('/customers', customerRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
// Deploy trigger comment v4
