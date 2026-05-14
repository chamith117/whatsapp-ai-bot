const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { db } = require('../backend/src/config/firebase');

const products = [
  {
    name: "Classic Leather Jacket",
    price: 129.99,
    description: "Premium black leather jacket with silver zippers.",
    category: "Apparel",
    stock: 25,
    createdAt: new Date().toISOString()
  },
  {
    name: "Wireless Noise-Cancelling Headphones",
    price: 249.00,
    description: "High-fidelity sound with 30-hour battery life.",
    category: "Electronics",
    stock: 15,
    createdAt: new Date().toISOString()
  },
  {
    name: "Smart Coffee Maker",
    price: 89.50,
    description: "App-controlled brewing with programmable schedule.",
    category: "Home Appliances",
    stock: 10,
    createdAt: new Date().toISOString()
  }
];

const seed = async () => {
  console.log("Seeding data...");
  
  try {
    // Seed Products
    for (const product of products) {
      await db.collection('products').add(product);
      console.log(`Added product: ${product.name}`);
    }

    // Seed an example order
    await db.collection('orders').add({
      customerName: "Jane Doe",
      whatsappId: "1234567890",
      totalAmount: 378.99,
      status: "pending",
      items: [
        { name: "Classic Leather Jacket", price: 129.99, quantity: 1 },
        { name: "Wireless Headphones", price: 249.00, quantity: 1 }
      ],
      createdAt: new Date().toISOString()
    });
    console.log("Added example order.");

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seed();
