const fs = require('fs');
const path = require('path');
const db = require('./db');

function runSeed() {
  const seedData = {
    users: [
      {
        id: 1,
        role: "admin",
        name: "Raghav (Shop Owner)",
        email: "owner@shop.com",
        phone: "+91 98765 43210",
        passwordHash: db.hashPassword("admin123"),
        createdAt: "2026-01-01T10:00:00Z"
      },
      {
        id: 2,
        role: "customer",
        name: "Rahul Sharma",
        email: "rahul.sharma@example.com",
        phone: "+91 98234 56781",
        passwordHash: db.hashPassword("customer123"),
        createdAt: "2026-01-10T12:00:00Z"
      },
      {
        id: 3,
        role: "customer",
        name: "Priya Patel",
        email: "priya.patel@example.com",
        phone: "+91 98345 67892",
        passwordHash: db.hashPassword("customer123"),
        createdAt: "2026-02-15T14:30:00Z"
      },
      {
        id: 4,
        role: "customer",
        name: "Amit Kumar",
        email: "amit.kumar@example.com",
        phone: "+91 98456 78903",
        passwordHash: db.hashPassword("customer123"),
        createdAt: "2026-03-01T09:15:00Z"
      },
      {
        id: 5,
        role: "customer",
        name: "Sneha Reddy",
        email: "sneha.reddy@example.com",
        phone: "+91 98567 89014",
        passwordHash: db.hashPassword("customer123"),
        createdAt: "2026-06-10T16:45:00Z"
      },
      {
        id: 6,
        role: "customer",
        name: "Vikram Singh",
        email: "vikram.singh@example.com",
        phone: "+91 98678 90125",
        passwordHash: db.hashPassword("customer123"),
        createdAt: "2026-05-20T11:20:00Z"
      }
    ],
    products: [
      {
        id: 1,
        name: "Wireless Noise Cancelling Headphones",
        description: "Studio-grade acoustics with active noise cancellation and 40h battery.",
        category: "Electronics",
        price: 4999,
        originalPrice: 6999,
        stock: 24,
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60",
        tags: ["Audio", "Bluetooth", "Bestseller"],
        createdAt: "2026-01-05T00:00:00Z"
      },
      {
        id: 2,
        name: "Smart Watch Ultra Pro",
        description: "AMOLED screen with real-time heart-rate, GPS tracking, and sleep analysis.",
        category: "Electronics",
        price: 8499,
        originalPrice: 10999,
        stock: 15,
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
        tags: ["Wearable", "Fitness", "Flagship"],
        createdAt: "2026-01-06T00:00:00Z"
      },
      {
        id: 3,
        name: "Organic Cotton Casual Hoodie",
        description: "Heavyweight 400 GSM breathable cotton comfort hoodie.",
        category: "Fashion",
        price: 1899,
        originalPrice: 2499,
        stock: 45,
        imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=60",
        tags: ["Apparel", "Cotton", "Streetwear"],
        createdAt: "2026-02-01T00:00:00Z"
      },
      {
        id: 4,
        name: "Minimalist Leather RFID Wallet",
        description: "Full-grain Italian leather with RFID theft blocking protection.",
        category: "Accessories",
        price: 1299,
        originalPrice: 1799,
        stock: 30,
        imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&auto=format&fit=crop&q=60",
        tags: ["Leather", "Accessories", "Gift"],
        createdAt: "2026-02-10T00:00:00Z"
      },
      {
        id: 5,
        name: "3-in-1 Fast Wireless Charging Dock",
        description: "Charges iPhone, Apple Watch, and AirPods simultaneously.",
        category: "Electronics",
        price: 2799,
        originalPrice: 3499,
        stock: 18,
        imageUrl: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=60",
        tags: ["Accessories", "Charger", "Desk"],
        createdAt: "2026-03-05T00:00:00Z"
      },
      {
        id: 6,
        name: "Thermal Smart Insulated Tumbler",
        description: "Keeps beverages hot for 12h or cold for 24h with digital LED temp display.",
        category: "Home & Kitchen",
        price: 999,
        originalPrice: 1499,
        stock: 50,
        imageUrl: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=60",
        tags: ["Tumbler", "Eco", "Home"],
        createdAt: "2026-03-12T00:00:00Z"
      }
    ],
    orders: [
      {
        id: 101, customerId: 2, customerName: "Rahul Sharma",
        createdAt: "2026-08-15T10:30:00Z", date: "2026-08-15T10:30:00Z",
        totalAmount: 8499, status: "Delivered",
        items: [{ productId: 2, name: "Smart Watch Ultra Pro", qty: 1, price: 8499 }]
      },
      {
        id: 102, customerId: 2, customerName: "Rahul Sharma",
        createdAt: "2026-07-20T14:00:00Z", date: "2026-07-20T14:00:00Z",
        totalAmount: 4999, status: "Delivered",
        items: [{ productId: 1, name: "Wireless Noise Cancelling Headphones", qty: 1, price: 4999 }]
      },
      {
        id: 103, customerId: 2, customerName: "Rahul Sharma",
        createdAt: "2026-06-05T18:15:00Z", date: "2026-06-05T18:15:00Z",
        totalAmount: 2799, status: "Delivered",
        items: [{ productId: 5, name: "3-in-1 Fast Wireless Charging Dock", qty: 1, price: 2799 }]
      },
      {
        id: 104, customerId: 3, customerName: "Priya Patel",
        createdAt: "2026-08-01T11:45:00Z", date: "2026-08-01T11:45:00Z",
        totalAmount: 3198, status: "Delivered",
        items: [
          { productId: 3, name: "Organic Cotton Casual Hoodie", qty: 1, price: 1899 },
          { productId: 4, name: "Minimalist Leather RFID Wallet", qty: 1, price: 1299 }
        ]
      },
      {
        id: 105, customerId: 4, customerName: "Amit Kumar",
        createdAt: "2026-06-01T09:20:00Z", date: "2026-06-01T09:20:00Z",
        totalAmount: 4999, status: "Delivered",
        items: [{ productId: 1, name: "Wireless Noise Cancelling Headphones", qty: 1, price: 4999 }]
      },
      {
        id: 106, customerId: 5, customerName: "Sneha Reddy",
        createdAt: "2026-08-25T15:10:00Z", date: "2026-08-25T15:10:00Z",
        totalAmount: 999, status: "Delivered",
        items: [{ productId: 6, name: "Thermal Smart Insulated Tumbler", qty: 1, price: 999 }]
      },
      {
        id: 107, customerId: 6, customerName: "Vikram Singh",
        createdAt: "2026-08-05T17:30:00Z", date: "2026-08-05T17:30:00Z",
        totalAmount: 1299, status: "Delivered",
        items: [{ productId: 4, name: "Minimalist Leather RFID Wallet", qty: 1, price: 1299 }]
      },
      {
        id: 108, customerId: 3, customerName: "Priya Patel",
        createdAt: "2026-08-20T13:00:00Z", date: "2026-08-20T13:00:00Z",
        totalAmount: 2799, status: "Delivered",
        items: [{ productId: 5, name: "3-in-1 Fast Wireless Charging Dock", qty: 1, price: 2799 }]
      },
      {
        id: 109, customerId: 4, customerName: "Amit Kumar",
        createdAt: "2026-08-10T10:00:00Z", date: "2026-08-10T10:00:00Z",
        totalAmount: 408, status: "Delivered",
        items: [{ productId: 6, name: "Thermal Smart Insulated Tumbler", qty: 1, price: 408 }]
      }
    ],
    transactions: [
      { id: 1, orderId: 101, customerId: 2, productId: 2, productName: "Smart Watch Ultra Pro", category: "Electronics", qty: 1, amount: 8499, date: "2026-08-15T10:30:00Z" },
      { id: 2, orderId: 102, customerId: 2, productId: 1, productName: "Wireless Noise Cancelling Headphones", category: "Electronics", qty: 1, amount: 4999, date: "2026-07-20T14:00:00Z" },
      { id: 3, orderId: 103, customerId: 2, productId: 5, productName: "3-in-1 Fast Wireless Charging Dock", category: "Electronics", qty: 1, amount: 2799, date: "2026-06-05T18:15:00Z" },
      { id: 4, orderId: 104, customerId: 3, productId: 3, productName: "Organic Cotton Casual Hoodie", category: "Fashion", qty: 1, amount: 1899, date: "2026-08-01T11:45:00Z" },
      { id: 5, orderId: 104, customerId: 3, productId: 4, productName: "Minimalist Leather RFID Wallet", category: "Accessories", qty: 1, amount: 1299, date: "2026-08-01T11:45:00Z" },
      { id: 6, orderId: 105, customerId: 4, productId: 1, productName: "Wireless Noise Cancelling Headphones", category: "Electronics", qty: 1, amount: 4999, date: "2026-06-01T09:20:00Z" },
      { id: 7, orderId: 106, customerId: 5, productId: 6, productName: "Thermal Smart Insulated Tumbler", category: "Home & Kitchen", qty: 1, amount: 999, date: "2026-08-25T15:10:00Z" },
      { id: 8, orderId: 107, customerId: 6, productId: 4, productName: "Minimalist Leather RFID Wallet", category: "Accessories", qty: 1, amount: 1299, date: "2026-08-05T17:30:00Z" },
      { id: 9, orderId: 108, customerId: 3, productId: 5, productName: "3-in-1 Fast Wireless Charging Dock", category: "Electronics", qty: 1, amount: 2799, date: "2026-08-20T13:00:00Z" },
      { id: 10, orderId: 109, customerId: 4, productId: 6, productName: "Thermal Smart Insulated Tumbler", category: "Home & Kitchen", qty: 1, amount: 408, date: "2026-08-10T10:00:00Z" }
    ],
    campaigns: [
      {
        id: 1, customerId: 4, customerName: "Amit Kumar",
        phone: "+91 98456 78903", productId: 5,
        productName: "3-in-1 Fast Wireless Charging Dock",
        message: "Hi Amit! Miss you at our shop! Enjoy 20% OFF on 3-in-1 Fast Wireless Charging Dock with code WINBACK20",
        discountCode: "WINBACK20", status: "Delivered (Demo)",
        sentAt: "2026-08-28T14:20:00Z"
      }
    ]
  };

  db.writeDb(seedData);
  console.log("Seed data initialized successfully!");
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
