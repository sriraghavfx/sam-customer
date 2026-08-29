// ============================================================
// Admin Dashboard Logic
// ============================================================

let currentUser = null;
let allCustomers = [];
let charts = {};
let currentAiRec = null;

// Auth Guard
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('shoppulse_user');
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
  localStorage.removeItem('shoppulse_user');
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
        <div class="text-xs text-slate-400">${c.phone || ''}</div>
      </td>
      <td class="px-5 py-3">
        <span class="segment-chip ${segColors[c.segment] || 'bg-slate-100 text-slate-600'}">${c.segment}</span>
      </td>
      <td class="px-5 py-3 text-slate-600">${c.orderCount || 0}</td>
      <td class="px-5 py-3 font-medium text-slate-800">₹${(c.totalSpent || 0).toLocaleString()}</td>
      <td class="px-5 py-3 text-slate-400 text-xs">${c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-IN') : '—'}</td>
      <td class="px-5 py-3">
        <button onclick="quickSMS(${c.id})" class="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-medium rounded-lg transition flex items-center gap-1">
          <i class="fa-solid fa-comment-sms"></i> SMS
        </button>
      </td>
    </tr>
  `).join('');
}

function filterCustomers() {
  const seg = document.getElementById('segmentFilter').value;
  const filtered = seg ? allCustomers.filter(c => c.segment === seg) : allCustomers;
  renderCustomers(filtered);
}

// ===== PRODUCTS =====
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    renderProducts(data.products || []);
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

// ===== AI SMS =====
function populateSmsSelect(customers) {
  const sel = document.getElementById('smsCustomerSelect');
  sel.innerHTML = '<option value="">— Choose a customer —</option>';
  customers.forEach(c => {
    sel.innerHTML += `<option value="${c.id}">${c.name} (${c.segment})</option>`;
  });
}

async function quickSMS(customerId) {
  switchTab('sms');
  document.getElementById('smsCustomerSelect').value = customerId;
  await generateAI();
}

async function generateAI() {
  const customerId = document.getElementById('smsCustomerSelect').value;
  if (!customerId) return showToast('Please select a customer first', 'error');

  const btn = document.querySelector('#tab-sms button[onclick="generateAI()"]');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Generating...';
  btn.disabled = true;

  try {
    const res = await fetch(`/api/ai/recommend/${customerId}`);
    const data = await res.json();
    if (!data.success) throw new Error('AI failed');
    currentAiRec = data.recommendation;

    document.getElementById('aiProductName').textContent = currentAiRec.productName;
    document.getElementById('aiReason').textContent = currentAiRec.reason;
    document.getElementById('aiDiscount').textContent = currentAiRec.discountCode;
    document.getElementById('aiConfidence').textContent = `${currentAiRec.confidence || 85}% match`;
    document.getElementById('aiResultCard').classList.remove('hidden');

    // Update phone mockup
    document.getElementById('smsPlaceholder').classList.add('hidden');
    document.getElementById('smsPreviewBubble').classList.remove('hidden');
    document.getElementById('smsPreviewText').textContent = currentAiRec.smsMessage;
  } catch (err) {
    showToast('AI generation failed: ' + err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate AI Recommendation';
    btn.disabled = false;
  }
}

async function sendSMS() {
  if (!currentAiRec) return;
  const customerId = document.getElementById('smsCustomerSelect').value;
  const cust = allCustomers.find(c => String(c.id) === String(customerId));
  if (!cust) return;

  try {
    await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: cust.id,
        customerName: cust.name,
        phone: cust.phone,
        productId: currentAiRec.productId,
        productName: currentAiRec.productName,
        message: currentAiRec.smsMessage,
        discountCode: currentAiRec.discountCode
      })
    });
    showToast(`SMS sent to ${cust.name}!`);
    loadCampaigns();
  } catch (err) {
    showToast('Send failed: ' + err.message, 'error');
  }
}

async function sendBulkSMS() {
  const segment = document.getElementById('bulkSegment').value;
  if (!confirm(`Send AI SMS to all "${segment}" customers?`)) return;
  try {
    const res = await fetch('/api/sms/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segment })
    });
    const data = await res.json();
    showToast(`Bulk SMS sent to ${data.count} customers!`);
    loadCampaigns();
  } catch (err) {
    showToast('Bulk SMS failed', 'error');
  }
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
