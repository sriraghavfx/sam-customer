const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const db = require('../db');
const { calculateRFM, getDashboardMetrics } = require('../services/analytics_service');
const { getRecommendation } = require('../services/ai_recommender');
const { sendSMS } = require('../services/sms_service');
const { runSeed } = require('../seed');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '../public');

// Initialize seed if database is empty
if (db.getUsers().length === 0) {
  runSeed();
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body) {
      return resolve(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}
module.exports = async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  try {
    // ================= AUTH API =================
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseJsonBody(req);
      const user = db.findUserByEmail(body.email);
      if (user && user.passwordHash === db.hashPassword(body.password)) {
        return sendJson(res, 200, { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
      }
      return sendJson(res, 401, { success: false, error: 'Invalid email or password' });
    }

    // ================= DASHBOARD METRICS API =================
    if (pathname === '/api/dashboard/metrics' && method === 'GET') {
      const metrics = getDashboardMetrics();
      return sendJson(res, 200, { success: true, metrics });
    }

    // ================= PRODUCTS API =================
    if (pathname === '/api/products' && method === 'GET') {
      const products = db.getProducts();
      return sendJson(res, 200, { success: true, products });
    }

    if (pathname === '/api/products' && method === 'POST') {
      const body = await parseJsonBody(req);
      
      let imageUrl = body.imageUrl;
      if (imageUrl && imageUrl.startsWith('data:image')) {
        // Vercel function can only write to /tmp
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
        const ext = imageUrl.substring(imageUrl.indexOf('/') + 1, imageUrl.indexOf(';'));
        const fileName = `product_${Date.now()}.${ext}`;
        const filePath = path.join('/tmp', fileName);
        try { fs.writeFileSync(filePath, base64Data, 'base64'); } catch(e){}
        imageUrl = `/uploads/${fileName}`; // Might not be served back properly on vercel without external storage
      }

      const product = db.createProduct({
        name: body.name,
        description: body.description,
        category: body.category,
        price: body.price,
        originalPrice: body.price * 1.25,
        stock: body.stock,
        tags: body.tags,
        imageUrl: imageUrl || '/uploads/placeholder.jpg'
      });
      return sendJson(res, 201, { success: true, product });
    }

    // ================= CUSTOMERS & RFM API =================
    if (pathname === '/api/customers' && method === 'GET') {
      const customers = calculateRFM();
      return sendJson(res, 200, { success: true, customers });
    }

    // GET /api/customers/:id/purchases
    if (pathname.match(/^\/api\/customers\/\d+\/purchases$/) && method === 'GET') {
      const customerId = pathname.split('/')[3];
      const orders = db.getOrdersByCustomer(customerId);
      const transactions = db.getTransactionsByCustomer(customerId);
      const products = db.getProducts();

      // Enrich transactions with product image & category
      const enriched = transactions.map(t => {
        const prod = products.find(p => p.id === Number(t.productId)) || {};
        return {
          ...t,
          imageUrl: prod.imageUrl || null,
          category: prod.category || 'General',
          productPrice: prod.price || t.amount
        };
      });

      return sendJson(res, 200, {
        success: true,
        orders,
        transactions: enriched,
        totalSpent: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
        totalItems: transactions.reduce((sum, t) => sum + (t.qty || 1), 0)
      });
    }

    if (pathname === '/api/customers' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.name || !body.email || !body.password) {
        return sendJson(res, 400, { success: false, error: 'Name, email and password are required' });
      }
      const existing = db.findUserByEmail(body.email);
      if (existing) return sendJson(res, 409, { success: false, error: 'Email already registered' });
      const user = db.createUser({
        name: body.name,
        email: body.email,
        password: body.password,
        phone: body.phone || '',
        role: 'customer'
      });
      return sendJson(res, 201, { success: true, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
    }

    if (pathname.startsWith('/api/customers/') && method === 'DELETE') {
      const customerId = pathname.split('/').pop();
      const user = db.findUserById(Number(customerId));
      if (!user) return sendJson(res, 404, { success: false, error: 'Customer not found' });
      if (user.role === 'admin') return sendJson(res, 403, { success: false, error: 'Cannot delete admin users' });
      db.deleteUser(customerId);
      return sendJson(res, 200, { success: true, message: 'Customer deleted' });
    }

    // ================= AI RECOMMENDATION API =================
    if (pathname.startsWith('/api/ai/recommend/') && method === 'GET') {
      const customerId = pathname.split('/').pop();
      const recommendation = await getRecommendation(customerId);
      return sendJson(res, 200, { success: true, recommendation });
    }

    // ================= SMS DISPATCH API =================
    if (pathname === '/api/sms/send' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await sendSMS(body);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/sms/bulk' && method === 'POST') {
      const body = await parseJsonBody(req);
      const targetSegment = body.segment || 'At-Risk';
      const customers = calculateRFM().filter(c => c.segment === targetSegment);

      let count = 0;
      for (const cust of customers) {
        const rec = await getRecommendation(cust.id);
        await sendSMS({
          customerId: cust.id,
          customerName: cust.name,
          phone: cust.phone,
          productId: rec.productId,
          productName: rec.productName,
          message: rec.smsMessage,
          discountCode: rec.discountCode
        });
        count++;
      }
      return sendJson(res, 200, { success: true, count });
    }

    // ================= CAMPAIGNS API =================
    if (pathname === '/api/campaigns' && method === 'GET') {
      const campaigns = db.getCampaigns();
      return sendJson(res, 200, { success: true, campaigns });
    }

    // ================= ORDERS API =================
    if (pathname === '/api/orders' && method === 'POST') {
      const body = await parseJsonBody(req);
      const dbData = db.readDb();

      // Build order record
      const orderId = dbData.orders.length ? Math.max(...dbData.orders.map(o => o.id)) + 1 : 1;
      const newOrder = {
        id: orderId,
        customerId: body.customerId || null,
        customerName: body.customerName || 'Guest',
        items: body.items || [],
        total: body.total || 0,
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      };
      dbData.orders.push(newOrder);

      // Add a transaction per item for analytics
      body.items && body.items.forEach(item => {
        const txId = dbData.transactions.length ? Math.max(...dbData.transactions.map(t => t.id)) + 1 : 1;
        dbData.transactions.push({
          id: txId,
          customerId: body.customerId || null,
          productId: item.productId,
          productName: item.productName,
          amount: item.price * item.qty,
          qty: item.qty,
          date: new Date().toISOString()
        });
        // Decrement stock
        const prod = dbData.products.find(p => p.id === Number(item.productId));
        if (prod && prod.stock > 0) prod.stock -= item.qty;
      });

      db.writeDb(dbData);
      return sendJson(res, 201, { success: true, orderId, order: newOrder });
    }

    // ================= REGISTER API =================
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.email || !body.password || !body.name) {
        return sendJson(res, 400, { success: false, error: 'Name, email and password required' });
      }
      const existing = db.findUserByEmail(body.email);
      if (existing) return sendJson(res, 409, { success: false, error: 'Email already registered' });
      const user = db.createUser({ name: body.name, email: body.email, password: body.password, phone: body.phone || '', role: 'customer' });
      return sendJson(res, 201, { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }

    // Fallback 404
    sendJson(res, 404, { error: 'Route not found' });
  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { error: err.message });
  }
};
