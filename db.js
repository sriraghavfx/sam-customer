const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'data', 'database.json');

const defaultData = {
  users: [],
  products: [],
  orders: [],
  transactions: [],
  campaigns: []
};

function initDb() {
  try {
    if (!fs.existsSync(path.dirname(DB_FILE))) {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
  } catch (err) {
    console.log('Skipping db init write (read-only filesystem likely)');
  }
}

let memoryDb = null;

function readDb() {
  if (memoryDb) return memoryDb;
  initDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    memoryDb = JSON.parse(raw);
    return memoryDb;
  } catch (err) {
    console.error('Error reading database:', err);
    memoryDb = defaultData;
    return memoryDb;
  }
}

function writeDb(data) {
  memoryDb = data; // Keep in memory for Vercel Serverless
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Skipping file write (Vercel read-only filesystem)');
    return false;
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'sam_salt_2026').digest('hex');
}

module.exports = {
  readDb,
  writeDb,
  hashPassword,

  // Users
  getUsers: () => readDb().users,
  findUserByEmail: (email) => readDb().users.find(u => u.email.toLowerCase() === email.toLowerCase()),
  findUserById: (id) => readDb().users.find(u => u.id === id),
  deleteUser: (id) => {
    const db = readDb();
    db.users = db.users.filter(u => u.id !== Number(id));
    writeDb(db);
  },
  createUser: (userData) => {
    const db = readDb();
    const newUser = {
      id: db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
      role: userData.role || 'customer',
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      passwordHash: userData.password ? hashPassword(userData.password) : null,
      googleId: userData.googleId || null,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    writeDb(db);
    return newUser;
  },

  // Products
  getProducts: () => readDb().products,
  findProductById: (id) => readDb().products.find(p => p.id === Number(id)),
  createProduct: (productData) => {
    const db = readDb();
    const newProduct = {
      id: db.products.length ? Math.max(...db.products.map(p => p.id)) + 1 : 1,
      name: productData.name,
      description: productData.description || '',
      category: productData.category || 'General',
      price: Number(productData.price),
      originalPrice: productData.originalPrice ? Number(productData.originalPrice) : null,
      stock: Number(productData.stock) || 0,
      imageUrl: productData.imageUrl || '/uploads/placeholder.jpg',
      tags: productData.tags || [],
      createdAt: new Date().toISOString()
    };
    db.products.push(newProduct);
    writeDb(db);
    return newProduct;
  },
  deleteProduct: (id) => {
    const db = readDb();
    db.products = db.products.filter(p => p.id !== Number(id));
    writeDb(db);
  },

  // Orders & Transactions
  getOrders: () => readDb().orders,
  getOrdersByCustomer: (customerId) => readDb().orders.filter(o => o.customerId === Number(customerId)),
  getTransactions: () => readDb().transactions,
  getTransactionsByCustomer: (customerId) => readDb().transactions.filter(t => t.customerId === Number(customerId)),

  // Campaigns
  getCampaigns: () => readDb().campaigns,
  createCampaign: (campData) => {
    const db = readDb();
    const newCampaign = {
      id: db.campaigns.length ? Math.max(...db.campaigns.map(c => c.id)) + 1 : 1,
      customerId: Number(campData.customerId),
      customerName: campData.customerName,
      phone: campData.phone,
      productId: Number(campData.productId),
      productName: campData.productName,
      message: campData.message,
      discountCode: campData.discountCode || 'SPECIAL10',
      status: campData.status || 'Sent (Demo)',
      sentAt: new Date().toISOString()
    };
    db.campaigns.unshift(newCampaign);
    writeDb(db);
    return newCampaign;
  }
};
