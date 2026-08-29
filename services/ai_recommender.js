const https = require('https');
const db = require('../db');

async function callGemini(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        response_mime_type: "application/json"
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            resolve(JSON.parse(text));
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', (e) => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
    req.write(payload);
    req.end();
  });
}

function heuristicRecommendation(customer, transactions, products, rfm) {
  // Determine categories bought
  const boughtProductIds = new Set(transactions.map(t => t.productId));
  const categoryFreq = {};
  transactions.forEach(t => {
    categoryFreq[t.category] = (categoryFreq[t.category] || 0) + 1;
  });

  const preferredCategory = Object.keys(categoryFreq).sort((a, b) => categoryFreq[b] - categoryFreq[a])[0] || 'Electronics';

  // Find products in same or complementary category not yet bought, or top in stock
  let candidate = products.find(p => p.category === preferredCategory && !boughtProductIds.has(p.id) && p.stock > 0);
  if (!candidate) {
    candidate = products.find(p => !boughtProductIds.has(p.id) && p.stock > 0) || products[0];
  }

  // Set discount and message based on customer segment
  let discountCode = 'SAVE10';
  let discountText = '10% OFF';
  let reasoning = `Customer frequently purchases items in '${preferredCategory}'. ${candidate.name} complements their prior purchases.`;

  if (rfm.segment === 'At-Risk') {
    discountCode = 'WINBACK20';
    discountText = '20% OFF';
    reasoning = `Customer has been inactive for ${rfm.recencyDays} days. Offering a high-value 20% win-back incentive on top-rated ${candidate.name}.`;
  } else if (rfm.segment === 'VIP Champion') {
    discountCode = 'VIPEXCLUSIVE';
    discountText = '15% VIP VIP perk';
    reasoning = `VIP customer with high lifetime spend (₹${rfm.monetary}). Recommending premium ${candidate.name} with VIP loyalty bonus.`;
  }

  const firstName = customer.name.split(' ')[0];
  const smsMessage = `Hi ${firstName}! Exclusive ${discountText} on our bestselling ${candidate.name}. Use code ${discountCode} at checkout: https://myshop.link/p/${candidate.id}`;

  return {
    productId: candidate.id,
    productName: candidate.name,
    productPrice: candidate.price,
    productImage: candidate.imageUrl,
    category: candidate.category,
    discountCode,
    discountText,
    reasoning,
    smsMessage,
    source: 'Heuristic-Engine (Smart RFM)'
  };
}

async function getRecommendation(customerId) {
  const customer = db.findUserById(Number(customerId));
  if (!customer) throw new Error('Customer not found');

  const transactions = db.getTransactionsByCustomer(customer.id);
  const products = db.getProducts();
  const { calculateRFM } = require('./analytics_service');
  const rfmList = calculateRFM();
  const rfm = rfmList.find(c => c.id === customer.id) || { segment: 'Loyal Buyer', recencyDays: 10, monetary: 5000 };

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    const prompt = `
      You are an expert ecommerce retail AI recommendation system.
      Customer Data:
      Name: ${customer.name}
      Segment: ${rfm.segment}
      Past Purchases: ${JSON.stringify(transactions)}
      
      Store Catalog:
      ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price })))}
      
      Task:
      Recommend the 1 best product from the catalog. Write a punchy SMS marketing message under 160 characters.
      
      Respond in strictly JSON:
      {
        "productId": 1,
        "productName": "Product Name",
        "discountCode": "DEAL15",
        "reasoning": "Reason for recommendation",
        "smsMessage": "Hi [Name]! Special offer: Get 15% off [Product] with code DEAL15. Shop: https://myshop.link/p/1"
      }
    `;

    try {
      const aiResult = await callGemini(prompt, apiKey);
      if (aiResult && aiResult.productId) {
        const prod = products.find(p => p.id === aiResult.productId) || products[0];
        return {
          productId: prod.id,
          productName: prod.name,
          productPrice: prod.price,
          productImage: prod.imageUrl,
          category: prod.category,
          discountCode: aiResult.discountCode || 'AI15',
          reasoning: aiResult.reasoning || `AI-selected match for customer preferences in ${prod.category}.`,
          smsMessage: aiResult.smsMessage,
          source: 'Google Gemini 1.5 Pro'
        };
      }
    } catch (e) {
      console.log('Gemini API call failed, falling back to smart heuristic:', e.message);
    }
  }

  return heuristicRecommendation(customer, transactions, products, rfm);
}

module.exports = {
  getRecommendation
};
