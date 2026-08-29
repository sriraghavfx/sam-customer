const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const db = require('./db');
const { calculateRFM, getDashboardMetrics } = require('./services/analytics_service');
const { getRecommendation } = require('./services/ai_recommender');
const { sendSMS } = require('./services/sms_service');
const { runSeed } = require('./seed');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize seed if database is empty
if (db.getUsers().length === 0) {
  runSeed();
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
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
const server = http.createServer(async (req, res) => {
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
    // ================= STATIC ASSETS =================
    if (pathname === '/' || pathname === '/index.html') {
      return serveStatic(req, res, path.join(PUBLIC_DIR, 'index.html'), 'text/html');
    }
    if (pathname.startsWith('/js/')) {
      return serveStatic(req, res, path.join(PUBLIC_DIR, pathname), 'application/javascript');
    }
    if (pathname.startsWith('/css/')) {
      return serveStatic(req, res, path.join(PUBLIC_DIR, pathname), 'text/css');
    }
    if (pathname.startsWith('/uploads/')) {
      const ext = path.extname(pathname).toLowerCase();
      const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
      return serveStatic(req, res, path.join(PUBLIC_DIR, pathname), mimeTypes[ext] || 'application/octet-stream');
    }

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
      
      // If image is a Base64 string, save to uploads
      let imageUrl = body.imageUrl;
      if (imageUrl && imageUrl.startsWith('data:image')) {
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
        const ext = imageUrl.substring(imageUrl.indexOf('/') + 1, imageUrl.indexOf(';'));
        const fileName = `product_${Date.now()}.${ext}`;
        const filePath = path.join(PUBLIC_DIR, 'uploads', fileName);
        fs.writeFileSync(filePath, base64Data, 'base64');
        imageUrl = `/uploads/${fileName}`;
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

    // Fallback 404
    sendJson(res, 404, { error: 'Route not found' });
  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 ShopPulse AI Server is running live!`);
  console.log(`📍 Web Dashboard: http://localhost:${PORT}`);
  console.log(`👤 Demo Shop Owner: owner@shop.com | Password: admin123`);
  console.log(`====================================================`);
});
