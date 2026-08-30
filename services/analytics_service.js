const db = require('../db');

// ============================================================
// Product-Based Segment Definitions
// These segments are assigned based on what a customer buys
// ============================================================
const PRODUCT_SEGMENTS = [
  {
    id: 'big_spender',
    label: 'Big Spender',
    icon: '💎',
    description: 'Spent ₹5,000+ across purchases',
    color: 'bg-black text-white',
    test: ({ totalSpent }) => totalSpent >= 5000
  },
  {
    id: 'frequent_buyer',
    label: 'Frequent Buyer',
    icon: '🔁',
    description: 'Made 3+ orders',
    color: 'bg-gray-800 text-white',
    test: ({ orderCount }) => orderCount >= 3
  },
  {
    id: 'category_loyalist',
    label: 'Category Loyalist',
    icon: '🏷️',
    description: '70%+ purchases in one category',
    color: 'bg-gray-600 text-white',
    test: ({ categoryLoyalty }) => categoryLoyalty >= 70
  },
  {
    id: 'deal_hunter',
    label: 'Deal Hunter',
    icon: '🏷️',
    description: 'Buys discounted/sale items frequently',
    color: 'bg-gray-500 text-white',
    test: ({ discountedRatio }) => discountedRatio >= 50
  },
  {
    id: 'variety_shopper',
    label: 'Variety Shopper',
    icon: '🛒',
    description: 'Bought from 3+ different categories',
    color: 'bg-gray-400 text-gray-900',
    test: ({ uniqueCategories }) => uniqueCategories >= 3
  },
  {
    id: 'window_shopper',
    label: 'Window Shopper',
    icon: '👀',
    description: 'Only 1 purchase ever',
    color: 'bg-gray-200 text-gray-800',
    test: ({ orderCount }) => orderCount === 1
  },
  {
    id: 'new_customer',
    label: 'New Customer',
    icon: '🆕',
    description: 'No purchases yet',
    color: 'bg-gray-100 text-gray-700',
    test: ({ orderCount }) => orderCount === 0
  }
];

function getProductSegments(user, userTransactions, userOrders, products) {
  const orderCount = userOrders.length;
  const totalSpent = userTransactions.reduce((s, t) => s + (t.amount || 0), 0);

  // Category breakdown from transactions
  const catSpend = {};
  const catCount = {};
  userTransactions.forEach(t => {
    const prod = products.find(p => p.id === Number(t.productId));
    const cat = (prod && prod.category) || t.category || 'General';
    catSpend[cat] = (catSpend[cat] || 0) + (t.amount || 0);
    catCount[cat] = (catCount[cat] || 0) + (t.qty || 1);
  });

  const uniqueCategories = Object.keys(catSpend).length;

  // Category loyalty %
  let categoryLoyalty = 0;
  let topCategory = 'None';
  let topCategorySpend = 0;
  if (totalSpent > 0) {
    const entries = Object.entries(catSpend).sort((a, b) => b[1] - a[1]);
    if (entries.length) {
      topCategory = entries[0][0];
      topCategorySpend = entries[0][1];
      categoryLoyalty = Math.round((topCategorySpend / totalSpent) * 100);
    }
  }

  // Discount ratio — products priced below original price
  let discountedItems = 0;
  userTransactions.forEach(t => {
    const prod = products.find(p => p.id === Number(t.productId));
    if (prod && prod.originalPrice && prod.originalPrice > prod.price) discountedItems++;
  });
  const discountedRatio = userTransactions.length > 0
    ? Math.round((discountedItems / userTransactions.length) * 100)
    : 0;

  // Top products purchased
  const productCounts = {};
  userTransactions.forEach(t => {
    productCounts[t.productName] = (productCounts[t.productName] || 0) + (t.qty || 1);
  });
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, qty]) => ({ name, qty }));

  // Match all applicable segment labels
  const ctx = { orderCount, totalSpent, categoryLoyalty, discountedRatio, uniqueCategories };
  const matchedSegments = PRODUCT_SEGMENTS.filter(s => s.test(ctx));
  // Primary product segment = first match
  const primaryProductSegment = matchedSegments[0] || PRODUCT_SEGMENTS[PRODUCT_SEGMENTS.length - 1];

  return {
    primaryProductSegment: primaryProductSegment.label,
    productSegmentIcon: primaryProductSegment.icon,
    productSegmentColor: primaryProductSegment.color,
    allProductSegments: matchedSegments.map(s => ({ label: s.label, icon: s.icon, color: s.color })),
    topCategory,
    topCategorySpend,
    categoryLoyalty,
    uniqueCategories,
    discountedRatio,
    topProducts,
    totalSpent,
    orderCount,
    categoryBreakdown: Object.entries(catSpend)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, spend]) => ({ cat, spend, count: catCount[cat] || 0 }))
  };
}

function calculateRFM() {
  const users = db.getUsers().filter(u => u.role === 'customer');
  const orders = db.getOrders();
  const transactions = db.getTransactions();
  const products = db.getProducts();
  const now = new Date();

  return users.map(user => {
    const userOrders = orders.filter(o => o.customerId === user.id);
    const userTransactions = transactions.filter(t => t.customerId === user.id);

    const frequency = userOrders.length;
    const monetary = userTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    let recencyDays = 999;
    let lastOrderDate = null;

    if (userOrders.length > 0) {
      const dates = userOrders
        .map(o => new Date(o.createdAt || o.date))
        .filter(d => !isNaN(d))
        .sort((a, b) => b - a);
      if (dates.length) {
        lastOrderDate = dates[0];
        recencyDays = Math.floor((now - lastOrderDate) / (1000 * 60 * 60 * 24));
      }
    }

    // ---- RFM Segment ----
    let segment;
    if (frequency >= 3 && monetary >= 5000 && recencyDays <= 60) {
      segment = 'Champions';
    } else if (frequency >= 2 && recencyDays <= 90) {
      segment = 'Loyal Customers';
    } else if (recencyDays > 90 && frequency >= 1) {
      segment = 'At-Risk';
    } else if (frequency === 1 && recencyDays <= 60) {
      segment = 'New Customers';
    } else if (frequency === 0) {
      segment = 'New Customers';
    } else {
      segment = 'Lost Customers';
    }

    // ---- Product-Based Segment ----
    const productData = getProductSegments(user, userTransactions, userOrders, products);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      orderCount: frequency,
      totalSpent: monetary,
      lastOrderDate: lastOrderDate ? lastOrderDate.toISOString() : null,
      recencyDays: recencyDays === 999 ? null : recencyDays,
      segment,                              // RFM segment
      ...productData                        // product-based segment fields
    };
  });
}

function getProductSegmentSummary() {
  const customers = calculateRFM();
  const products = db.getProducts();

  // Per-segment customer list
  const segmentMap = {};
  PRODUCT_SEGMENTS.forEach(s => {
    segmentMap[s.label] = {
      label: s.label,
      icon: s.icon,
      description: s.description,
      color: s.color,
      customers: [],
      totalSpent: 0
    };
  });

  customers.forEach(c => {
    c.allProductSegments.forEach(seg => {
      if (segmentMap[seg.label]) {
        segmentMap[seg.label].customers.push({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          orderCount: c.orderCount,
          totalSpent: c.totalSpent,
          topCategory: c.topCategory,
          topProducts: c.topProducts,
          categoryBreakdown: c.categoryBreakdown
        });
        segmentMap[seg.label].totalSpent += c.totalSpent;
      }
    });
  });

  // Category overview — which categories drive most revenue
  const categoryRevenue = {};
  const transactions = db.getTransactions();
  transactions.forEach(t => {
    const prod = products.find(p => p.id === Number(t.productId));
    const cat = (prod && prod.category) || t.category || 'General';
    categoryRevenue[cat] = (categoryRevenue[cat] || 0) + (t.amount || 0);
  });

  const topCategories = Object.entries(categoryRevenue)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, revenue]) => ({ cat, revenue }));

  return {
    segments: Object.values(segmentMap),
    topCategories,
    totalCustomers: customers.length
  };
}

function getDashboardMetrics() {
  const rfmList = calculateRFM();
  const orders = db.getOrders();
  const products = db.getProducts();
  const transactions = db.getTransactions();

  const totalRevenue = rfmList.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders = orders.length;
  const totalCustomers = rfmList.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const segmentCounts = {};
  rfmList.forEach(c => {
    segmentCounts[c.segment] = (segmentCounts[c.segment] || 0) + 1;
  });

  const revenueByMonth = {};
  transactions.forEach(t => {
    const month = new Date(t.date).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    revenueByMonth[month] = (revenueByMonth[month] || 0) + (t.amount || 0);
  });

  return {
    totalRevenue,
    totalOrders,
    totalCustomers,
    totalProducts: products.length,
    avgOrderValue,
    segmentCounts,
    revenueByMonth: Object.entries(revenueByMonth).map(([month, revenue]) => ({ month, revenue }))
  };
}

module.exports = { calculateRFM, getDashboardMetrics, getProductSegmentSummary, PRODUCT_SEGMENTS };
