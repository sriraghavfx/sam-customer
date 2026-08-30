// ============================================================
// Admin Dashboard Logic
// ============================================================

let currentUser = null;
let allCustomers = [];
let charts = {};
let currentAiRec = null;

// Auth Guard
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('SAM_user');
  if (!saved) return window.location.href = '/index.html';
  currentUser = JSON.parse(saved);
  if (currentUser.role !== 'admin' && currentUser.role !== 'owner') {
    return window.location.href = '/shop.html';
  }
  document.getElementById('adminName').textContent = currentUser.name || 'Admin';
  loadDashboard();
  loadCustomers();
  loadProducts();
  loadCampaigns();
});

function handleLogout() {
  localStorage.removeItem('SAM_user');
  window.location.href = '/index.html';
}

// ===== TAB SWITCHING =====
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.remove('active');
    el.classList.add('text-slate-400');
    el.classList.remove('text-white');
  });
  document.getElementById(`tab-${tabId}`).classList.add('active');
  const btn = document.getElementById(`nav-${tabId}`);
  btn.classList.add('active');
  btn.classList.remove('text-slate-400');
}

// ===== TOAST =====
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  document.getElementById('toastMsg').textContent = msg;
  icon.className = type === 'success'
    ? 'fa-solid fa-check-circle text-green-400'
    : 'fa-solid fa-triangle-exclamation text-amber-400';
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3500);
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard/metrics');
    const data = await res.json();
    if (!data.success) return;
    const m = data.metrics;
    renderKPIs(m);
    renderCharts(m);
  } catch (e) { console.error(e); }
}

function renderKPIs(m) {
  const cards = [
    { label: 'Total Revenue', value: `₹${(m.totalRevenue || 0).toLocaleString()}`, icon: 'fa-indian-rupee-sign', color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Total Orders', value: m.totalOrders || 0, icon: 'fa-bag-shopping', color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Total Customers', value: m.totalCustomers || 0, icon: 'fa-users', color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Avg Order Value', value: `₹${(m.avgOrderValue || 0).toFixed(0)}`, icon: 'fa-chart-line', color: 'text-brand-500', bg: 'bg-brand-50' },
  ];
  document.getElementById('kpiCards').innerHTML = cards.map(c => `
    <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center ${c.color}">
          <i class="fa-solid ${c.icon}"></i>
        </div>
        <span class="text-xs text-slate-500 font-medium">${c.label}</span>
      </div>
      <div class="text-2xl font-bold text-slate-900">${c.value}</div>
    </div>
  `).join('');
}

function renderCharts(m) {
  // Revenue Chart
  const rCtx = document.getElementById('revenueChart').getContext('2d');
  if (charts.revenue) charts.revenue.destroy();
  charts.revenue = new Chart(rCtx, {
    type: 'line',
    data: {
      labels: (m.revenueByMonth || []).map(r => r.month),
      datasets: [{
        label: 'Revenue (₹)',
        data: (m.revenueByMonth || []).map(r => r.revenue),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79,70,229,0.08)',
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#4f46e5',
        fill: true,
        tension: 0.4
      }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } }, responsive: true }
  });

  // Segment Doughnut
  const sCtx = document.getElementById('segmentChart').getContext('2d');
  if (charts.segment) charts.segment.destroy();
  const segData = m.segmentBreakdown || {};
  const segColors = { Champions:'#22c55e', 'Loyal Customers':'#3b82f6', 'New Customers':'#a855f7', 'At-Risk':'#f59e0b', 'Lost Customers':'#ef4444', 'Potential Loyalist':'#06b6d4' };
  charts.segment = new Chart(sCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(segData),
      datasets: [{
        data: Object.values(segData),
        backgroundColor: Object.keys(segData).map(k => segColors[k] || '#94a3b8'),
        borderWidth: 2
      }]
    },
    options: { plugins: { legend: { position: 'bottom' } }, responsive: true }
  });
}

// ===== CUSTOMERS =====
async function loadCustomers() {
  try {
    const res = await fetch('/api/customers');
    const data = await res.json();
    allCustomers = data.customers || [];
    renderCustomers(allCustomers);
    populateSmsSelect(allCustomers);
  } catch (e) { console.error(e); }
}

function renderCustomers(customers) {
  const segColors = {
    Champions: 'bg-green-100 text-green-700',
    'Loyal Customers': 'bg-blue-100 text-blue-700',
    'New Customers': 'bg-purple-100 text-purple-700',
    'At-Risk': 'bg-amber-100 text-amber-700',
    'Lost Customers': 'bg-red-100 text-red-700',
    'Potential Loyalist': 'bg-cyan-100 text-cyan-700',
  };
  if (!customers.length) {
    document.getElementById('customersTable').innerHTML = '<tr><td colspan="6" class="text-center py-12 text-slate-400">No customers found</td></tr>';
    return;
  }
  document.getElementById('customersTable').innerHTML = customers.map(c => `
    <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
      <td class="px-5 py-3">
        <div class="font-medium text-slate-900">${c.name}</div>
        <div class="text-xs text-slate-400">${c.email || ''}</div>
        <div class="text-xs text-slate-400">${c.phone || ''}</div>
      </td>
      <td class="px-5 py-3">
        <span class="segment-chip ${segColors[c.segment] || 'bg-slate-100 text-slate-600'}">${c.segment}</span>
      </td>
      <td class="px-5 py-3 text-slate-600">${c.orderCount || 0}</td>
      <td class="px-5 py-3 font-medium text-slate-800">₹${(c.totalSpent || 0).toLocaleString()}</td>
      <td class="px-5 py-3 text-slate-400 text-xs">${c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-IN') : '—'}</td>
      <td class="px-5 py-3">
        <div class="flex items-center gap-2 flex-wrap">
          <button onclick="viewPurchases(${c.id}, '${c.name.replace(/'/g, '')}')" class="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-lg transition flex items-center gap-1">
            <i class="fa-solid fa-bag-shopping"></i> Purchases
          </button>
          <button onclick="quickSMS(${c.id})" class="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-medium rounded-lg transition flex items-center gap-1">
            <i class="fa-solid fa-comment-sms"></i> SMS
          </button>
          <button onclick="deleteCustomer(${c.id}, '${c.name.replace(/'/g, '')}')" class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition flex items-center gap-1">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function addCustomer(e) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const btn = document.getElementById('addCustomerBtn');
  const errEl = document.getElementById('addCustomerError');
  errEl.classList.add('hidden');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Adding...';

  try {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        password: fd.get('password')
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Customer "${fd.get('name')}" added successfully!`);
      document.getElementById('addCustomerModal').classList.add('hidden');
      form.reset();
      loadCustomers();
    } else {
      errEl.textContent = data.error || 'Failed to add customer';
      errEl.classList.remove('hidden');
    }
  } catch (err) {
    errEl.textContent = 'Error: ' + err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Add Customer';
  }
}

async function deleteCustomer(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"?\nThis action cannot be undone.`)) return;
  try {
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(`Customer "${name}" deleted.`, 'warning');
      loadCustomers();
    } else {
      showToast(data.error || 'Delete failed', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

function filterCustomers() {
  const seg = document.getElementById('segmentFilter').value;
  const filtered = seg ? allCustomers.filter(c => c.segment === seg) : allCustomers;
  renderCustomers(filtered);
}

// ===== CUSTOMER PURCHASES PANEL =====
async function viewPurchases(customerId, customerName) {
  // Open panel
  const panel = document.getElementById('purchasesPanel');
  const overlay = document.getElementById('purchasesOverlay');
  document.getElementById('purchasesPanelTitle').textContent = customerName + "'s Purchases";
  document.getElementById('purchasesPanelSub').textContent = 'Full purchase history';
  document.getElementById('pTotalSpent').textContent = '—';
  document.getElementById('pTotalOrders').textContent = '—';
  document.getElementById('pTotalItems').textContent = '—';
  document.getElementById('purchasesList').innerHTML = `
    <div class="flex items-center justify-center h-40 text-slate-400">
      <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading...
    </div>`;
  overlay.classList.remove('hidden');
  setTimeout(() => panel.classList.remove('translate-x-full'), 10);

  try {
    const res = await fetch(`/api/customers/${customerId}/purchases`);
    const data = await res.json();

    if (!data.success) throw new Error('Failed to load');

    // Update stats
    document.getElementById('pTotalSpent').textContent = '₹' + (data.totalSpent || 0).toLocaleString();
    document.getElementById('pTotalOrders').textContent = data.orders.length;
    document.getElementById('pTotalItems').textContent = data.totalItems || 0;
    document.getElementById('purchasesPanelSub').textContent =
      `${data.transactions.length} product purchase${data.transactions.length !== 1 ? 's' : ''}`;

    // Render purchases
    if (!data.transactions.length) {
      document.getElementById('purchasesList').innerHTML = `
        <div class="flex flex-col items-center justify-center h-48 text-slate-400">
          <i class="fa-solid fa-bag-shopping text-4xl mb-3 opacity-30"></i>
          <p class="text-sm">No purchases yet</p>
          <p class="text-xs mt-1">This customer hasn't bought anything yet</p>
        </div>`;
      return;
    }

    document.getElementById('purchasesList').innerHTML = data.transactions.map(t => `
      <div class="flex items-center gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
        <div class="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 flex-shrink-0">
          <img src="${t.imageUrl || 'https://via.placeholder.com/64?text=P'}"
            alt="${t.productName}"
            class="w-full h-full object-cover"
            onerror="this.src='https://via.placeholder.com/64?text=P'">
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-slate-900 text-sm truncate">${t.productName}</div>
          <div class="text-xs text-slate-400 mt-0.5">${t.category || 'General'}</div>
          <div class="flex items-center gap-3 mt-1.5">
            <span class="text-brand-600 font-bold text-sm">₹${(t.amount || 0).toLocaleString()}</span>
            <span class="text-xs text-slate-400">Qty: ${t.qty || 1}</span>
            <span class="text-xs text-slate-400">${t.date ? new Date(t.date).toLocaleDateString('en-IN') : '—'}</span>
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <i class="fa-solid fa-check-circle mr-1"></i> Purchased
          </span>
        </div>
      </div>
    `).join('');

  } catch (err) {
    document.getElementById('purchasesList').innerHTML = `
      <div class="text-center text-red-500 py-8">Failed to load purchases: ${err.message}</div>`;
  }
}

function closePurchases() {
  const panel = document.getElementById('purchasesPanel');
  const overlay = document.getElementById('purchasesOverlay');
  panel.classList.add('translate-x-full');
  setTimeout(() => overlay.classList.add('hidden'), 300);
}

// ===== PRODUCTS =====
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    const products = data.products || [];
    renderProducts(products);
    populateNotifProductSelect(products); // feed notification tab
  } catch (e) { console.error(e); }
}

function renderProducts(products) {
  if (!products.length) {
    document.getElementById('productsGrid').innerHTML = '<p class="col-span-full text-center text-slate-400 py-12">No products yet. Add your first product!</p>';
    return;
  }
  document.getElementById('productsGrid').innerHTML = products.map(p => `
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition">
      <div class="h-40 bg-slate-100 flex items-center justify-center overflow-hidden">
        <img src="${p.imageUrl || '/uploads/placeholder.jpg'}" alt="${p.name}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x160?text=No+Image'">
      </div>
      <div class="p-4">
        <div class="text-xs text-slate-400 mb-1">${p.category || 'General'}</div>
        <h3 class="font-semibold text-slate-900 text-sm truncate">${p.name}</h3>
        <div class="flex items-center justify-between mt-2">
          <span class="text-brand-600 font-bold">₹${(p.price || 0).toLocaleString()}</span>
          <span class="text-xs text-slate-400">${p.stock} in stock</span>
        </div>
      </div>
    </div>
  `).join('');
}

function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('imagePreview');
    img.src = e.target.result;
    img.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

async function addProduct(e) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const imageFile = fd.get('image');
  let imageUrl = null;

  if (imageFile && imageFile.size > 0) {
    imageUrl = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target.result);
      reader.readAsDataURL(imageFile);
    });
  }

  const payload = {
    name: fd.get('name'),
    price: parseFloat(fd.get('price')),
    stock: parseInt(fd.get('stock')),
    category: fd.get('category'),
    description: fd.get('description'),
    tags: fd.get('tags') ? fd.get('tags').split(',').map(t => t.trim()) : [],
    imageUrl
  };

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Product added successfully!');
      document.getElementById('addProductModal').classList.add('hidden');
      form.reset();
      document.getElementById('imagePreview').classList.add('hidden');
      loadProducts();
    } else {
      showToast('Failed to add product', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ===== NOTIFICATIONS (Product → Customers) =====
let allProducts_notif = []; // cached for notification tab

function populateSmsSelect(customers) {
  // Fill the single-customer select in Notifications tab
  const sel = document.getElementById('notifCustomerSelect');
  if (sel) {
    sel.innerHTML = '<option value="">— Choose customer —</option>';
    customers.forEach(c => {
      sel.innerHTML += `<option value="${c.id}">${c.name} (${c.segment})</option>`;
    });
  }
}

function populateNotifProductSelect(products) {
  allProducts_notif = products;
  const sel = document.getElementById('notifProductSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select a product —</option>';
  products.forEach(p => {
    sel.innerHTML += `<option value="${p.id}">${p.name} — ₹${p.price.toLocaleString()}</option>`;
  });
}

function onProductSelected() {
  const sel = document.getElementById('notifProductSelect');
  const productId = sel.value;
  const preview = document.getElementById('notifProductPreview');
  if (!productId) { preview.classList.add('hidden'); return; }
  const p = allProducts_notif.find(x => String(x.id) === String(productId));
  if (!p) return;
  document.getElementById('notifProductImg').src = p.imageUrl || 'https://via.placeholder.com/64?text=P';
  document.getElementById('notifProductImg').onerror = function() { this.src='https://via.placeholder.com/64?text=P'; };
  document.getElementById('notifProductName').textContent = p.name;
  document.getElementById('notifProductCat').textContent = p.category || 'General';
  document.getElementById('notifProductPrice').textContent = '₹' + p.price.toLocaleString();
  preview.classList.remove('hidden');
}

async function generateNotification() {
  const productId = document.getElementById('notifProductSelect').value;
  if (!productId) return showToast('Please select a product first', 'error');

  const btn = document.getElementById('generateNotifBtn');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Generating...';
  btn.disabled = true;

  const product = allProducts_notif.find(p => String(p.id) === String(productId));
  const discount = document.getElementById('notifDiscountCode').value || 'SAVE10';

  try {
    // Use AI to generate notification message for this product
    const res = await fetch('/api/ai/product-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, discountCode: discount })
    });
    const data = await res.json();
    const message = data.message || `🎉 New deal at SAM Store!\n\n${product.name} is now available for just ₹${product.price.toLocaleString()}!\n\nUse code ${discount} for extra savings.\n\nShop now → sam-store.vercel.app`;

    // Count recipients
    const target = document.querySelector('input[name="notifTarget"]:checked')?.value || 'segment';
    let recipientLabel = '';
    if (target === 'all') recipientLabel = 'All customers';
    else if (target === 'segment') recipientLabel = document.getElementById('notifSegmentSelect').value + ' segment';
    else recipientLabel = '1 customer';

    document.getElementById('notifResultCard').classList.remove('hidden');
    document.getElementById('notifMessageEdit').value = message;
    document.getElementById('notifRecipientCount').textContent = '→ ' + recipientLabel;

    // Update phone preview
    document.getElementById('notifPlaceholder').classList.add('hidden');
    document.getElementById('notifPreviewBubble').classList.remove('hidden');
    document.getElementById('notifPreviewText').textContent = message;

  } catch (err) {
    // Fallback message if API fails
    const fallback = `🎉 SAM Ecommerce Store\n\n${product ? product.name : 'New Product'} — Now available!\n₹${product ? product.price.toLocaleString() : ''}\n\nUse code ${discount} for extra savings!\nShop now 🛍️`;
    document.getElementById('notifResultCard').classList.remove('hidden');
    document.getElementById('notifMessageEdit').value = fallback;
    document.getElementById('notifPreviewBubble').classList.remove('hidden');
    document.getElementById('notifPlaceholder').classList.add('hidden');
    document.getElementById('notifPreviewText').textContent = fallback;
    document.getElementById('notifRecipientCount').textContent = '→ ready to send';
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate AI Notification';
    btn.disabled = false;
  }
}

async function sendProductNotification() {
  const productId = document.getElementById('notifProductSelect').value;
  const product = allProducts_notif.find(p => String(p.id) === String(productId));
  if (!product) return showToast('Please select a product first', 'error');

  const message = document.getElementById('notifMessageEdit').value;
  if (!message.trim()) return showToast('Message cannot be empty', 'error');

  const target = document.querySelector('input[name="notifTarget"]:checked')?.value || 'segment';
  const discountCode = document.getElementById('notifDiscountCode').value;
  const btn = document.getElementById('sendNotifBtn');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Sending...';
  btn.disabled = true;

  let recipients = [];
  if (target === 'all') {
    recipients = allCustomers;
  } else if (target === 'segment') {
    const seg = document.getElementById('notifSegmentSelect').value;
    recipients = allCustomers.filter(c => c.segment === seg);
  } else {
    const custId = document.getElementById('notifCustomerSelect').value;
    const cust = allCustomers.find(c => String(c.id) === String(custId));
    if (cust) recipients = [cust];
  }

  if (!recipients.length) {
    showToast('No customers found for selected target', 'error');
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Notification';
    btn.disabled = false;
    return;
  }

  try {
    let sent = 0;
    for (const cust of recipients) {
      await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: cust.id,
          customerName: cust.name,
          phone: cust.phone,
          productId: product.id,
          productName: product.name,
          message,
          discountCode
        })
      });
      sent++;
    }
    showToast(`✅ Notification sent to ${sent} customer${sent !== 1 ? 's' : ''}!`);
    loadCampaigns();
    document.getElementById('notifResultCard').classList.add('hidden');
    document.getElementById('notifPreviewBubble').classList.add('hidden');
    document.getElementById('notifPlaceholder').classList.remove('hidden');
  } catch (err) {
    showToast('Send failed: ' + err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Notification';
    btn.disabled = false;
  }
}

// Keep quickSMS working from customers tab (opens notifications tab)
async function quickSMS(customerId) {
  switchTab('sms');
  // Set single customer target
  const radio = document.querySelector('input[name="notifTarget"][value="single"]');
  if (radio) radio.checked = true;
  const sel = document.getElementById('notifCustomerSelect');
  if (sel) sel.value = customerId;
}

// ===== CAMPAIGNS =====
async function loadCampaigns() {
  try {
    const res = await fetch('/api/campaigns');
    const data = await res.json();
    const campaigns = data.campaigns || [];
    if (!campaigns.length) {
      document.getElementById('campaignsTable').innerHTML = '<tr><td colspan="6" class="text-center py-12 text-slate-400">No campaigns sent yet</td></tr>';
      return;
    }
    document.getElementById('campaignsTable').innerHTML = campaigns.map(c => `
      <tr class="border-b border-slate-50 hover:bg-slate-50">
        <td class="px-5 py-3 font-medium text-slate-900">${c.customerName}</td>
        <td class="px-5 py-3 text-slate-500">${c.phone || '—'}</td>
        <td class="px-5 py-3 text-slate-600">${c.productName}</td>
        <td class="px-5 py-3 text-slate-500 max-w-xs truncate text-xs">${c.message}</td>
        <td class="px-5 py-3"><span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">${c.status}</span></td>
        <td class="px-5 py-3 text-slate-400 text-xs">${new Date(c.sentAt).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');
  } catch (e) { console.error(e); }
}
