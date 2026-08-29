let currentUser = null;
let currentAiRecommendation = null;
let currentTargetCustomer = null;
let charts = {};
let allCustomers = [];

document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('shoppulse_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
  } else {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
  }
});

function quickLogin() {
  document.getElementById('loginEmail').value = 'owner@shop.com';
  document.getElementById('loginPassword').value = 'admin123';
  handleLogin(new Event('submit'));
}

async function handleLogin(e) {
  if (e) e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('shoppulse_user', JSON.stringify(currentUser));
      showApp();
    } else {
      alert(data.error || 'Invalid credentials');
    }
  } catch (err) {
    alert('Server connection error: ' + err.message);
  }
}

function handleLogout() {
  localStorage.removeItem('shoppulse_user');
  currentUser = null;
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
}

function showApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  document.getElementById('currentUserDisplay').innerText = currentUser.name;
  loadDashboard();
  loadProducts();
  loadCustomers();
  loadCampaigns();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('text-brand-600', 'bg-brand-50');
    el.classList.add('text-slate-600');
  });

  const activeTab = document.getElementById(`tab-${tabId}`);
  if (activeTab) activeTab.classList.remove('hidden');

  const navBtn = document.getElementById(`nav-${tabId}`);
  if (navBtn) {
    navBtn.classList.remove('text-slate-600');
    navBtn.classList.add('text-brand-600', 'bg-brand-50');
  }

  if (tabId === 'dashboard' || tabId === 'strategies') {
    setTimeout(renderCharts, 100);
  }
}

async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard/metrics');
    const data = await res.json();
    if (data.success) {
      const m = data.metrics;
      document.getElementById('kpiRevenue').innerText = '₹' + m.totalRevenue.toLocaleString('en-IN');
      document.getElementById('kpiOrders').innerText = m.totalOrders;
      document.getElementById('kpiAOV').innerText = '₹' + m.aov.toLocaleString('en-IN');
      document.getElementById('kpiCustomers').innerText = m.totalCustomers;
      document.getElementById('kpiRepeatRate').innerText = m.repeatRate + '%';
      document.getElementById('kpiAtRisk').innerText = m.atRiskCount;
      document.getElementById('atRiskBannerCount').innerText = `${m.atRiskCount} customer${m.atRiskCount === 1 ? '' : 's'}`;

      window.dashboardMetrics = m;
      renderCharts();
    }
  } catch (err) {
    console.error('Error loading metrics:', err);
  }
}

function renderCharts() {
  const m = window.dashboardMetrics;
  if (!m) return;

  // Monthly Sales Chart
  const ctxMonthly = document.getElementById('monthlySalesChart');
  if (ctxMonthly) {
    if (charts.monthly) charts.monthly.destroy();
    charts.monthly = new Chart(ctxMonthly, {
      type: 'line',
      data: {
        labels: Object.keys(m.monthlySales),
        datasets: [{
          label: 'Monthly Revenue (₹)',
          data: Object.values(m.monthlySales),
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  // Category Doughnut Chart
  const ctxCat = document.getElementById('categoryChart');
  if (ctxCat) {
    if (charts.category) charts.category.destroy();
    charts.category = new Chart(ctxCat, {
      type: 'doughnut',
      data: {
        labels: Object.keys(m.categorySales),
        datasets: [{
          data: Object.values(m.categorySales),
          backgroundColor: ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  // Forecast Chart
  const ctxForecast = document.getElementById('forecastChart');
  if (ctxForecast) {
    if (charts.forecast) charts.forecast.destroy();
    const histLabels = Object.keys(m.monthlySales);
    const histValues = Object.values(m.monthlySales);
    const fLabels = Object.keys(m.forecast);
    const fValues = Object.values(m.forecast);

    charts.forecast = new Chart(ctxForecast, {
      type: 'line',
      data: {
        labels: [...histLabels, ...fLabels],
        datasets: [
          {
            label: 'Historical Sales (₹)',
            data: [...histValues, null, null, null],
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            borderWidth: 2.5,
            tension: 0.3
          },
          {
            label: 'AI Forecast (₹)',
            data: [...Array(histValues.length - 1).fill(null), histValues[histValues.length - 1], ...fValues],
            borderColor: '#f59e0b',
            borderDash: [6, 6],
            borderWidth: 2.5,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } }
      }
    });
  }
}
// ================= PRODUCTS =================
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) {
      const grid = document.getElementById('productsGrid');
      grid.innerHTML = data.products.map(p => `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition group">
          <div class="relative h-48 bg-slate-100 overflow-hidden">
            <img src="${p.imageUrl}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            <span class="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/90 text-slate-800 shadow-sm">
              ${p.category}
            </span>
          </div>
          <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
            <div>
              <h3 class="font-bold text-slate-900 line-clamp-1">${p.name}</h3>
              <p class="text-xs text-slate-500 line-clamp-2 mt-1">${p.description}</p>
            </div>
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span class="text-base font-bold text-slate-900">₹${p.price.toLocaleString('en-IN')}</span>
                ${p.originalPrice ? `<span class="text-xs text-slate-400 line-through ml-1.5">₹${p.originalPrice.toLocaleString('en-IN')}</span>` : ''}
              </div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded ${p.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">
                ${p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
              </span>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

function openAddProductModal() {
  document.getElementById('addProductModal').classList.remove('hidden');
}

function closeAddProductModal() {
  document.getElementById('addProductModal').classList.add('hidden');
  document.getElementById('addProductForm').reset();
  document.getElementById('imagePreviewContainer').classList.add('hidden');
}

function previewSelectedImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('imagePreview').src = e.target.result;
      document.getElementById('imagePreviewContainer').classList.remove('hidden');
    }
    reader.readAsDataURL(file);
  }
}

async function handleAddProduct(e) {
  e.preventDefault();
  const name = document.getElementById('prodName').value;
  const category = document.getElementById('prodCategory').value;
  const price = document.getElementById('prodPrice').value;
  const stock = document.getElementById('prodStock').value;
  const tags = document.getElementById('prodTags').value.split(',').map(t => t.trim());
  const description = document.getElementById('prodDesc').value;

  let imageUrl = document.getElementById('prodImageUrl').value;
  const imageFile = document.getElementById('prodImageFile').files[0];

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = async function() {
      imageUrl = reader.result;
      await submitProductPayload({ name, category, price, stock, tags, description, imageUrl });
    };
    reader.readAsDataURL(imageFile);
  } else {
    if (!imageUrl) imageUrl = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60';
    await submitProductPayload({ name, category, price, stock, tags, description, imageUrl });
  }
}

async function submitProductPayload(payload) {
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      closeAddProductModal();
      loadProducts();
      loadDashboard();
    }
  } catch (err) {
    alert('Error saving product: ' + err.message);
  }
}

// ================= CUSTOMERS & RFM =================
async function loadCustomers() {
  try {
    const res = await fetch('/api/customers');
    const data = await res.json();
    if (data.success) {
      allCustomers = data.customers;
      renderCustomersTable(allCustomers);
    }
  } catch (err) {
    console.error('Error loading customers:', err);
  }
}

function renderCustomersTable(customers) {
  const tbody = document.getElementById('customersTableBody');
  tbody.innerHTML = customers.map(c => `
    <tr class="hover:bg-slate-50 transition">
      <td class="px-5 py-4 font-semibold text-slate-900">${c.name}</td>
      <td class="px-5 py-4 text-slate-500 font-mono text-xs">${c.phone}</td>
      <td class="px-5 py-4">
        <span class="px-2.5 py-1 rounded-full text-xs font-bold border ${c.badgeClass}">
          ${c.segment}
        </span>
      </td>
      <td class="px-5 py-4 font-medium text-slate-700">${c.ordersCount} orders</td>
      <td class="px-5 py-4 font-bold text-slate-900">₹${c.monetary.toLocaleString('en-IN')}</td>
      <td class="px-5 py-4 text-slate-500 text-xs">${typeof c.recencyDays === 'number' ? `${c.recencyDays} days ago` : c.recencyDays}</td>
      <td class="px-5 py-4 text-xs font-semibold text-indigo-600">${c.topCategory}</td>
      <td class="px-5 py-4 text-right">
        <button onclick="openAiRecommendationModal(${c.id})" class="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium rounded-lg text-xs transition border border-brand-200 inline-flex items-center gap-1.5">
          <i class="fa-solid fa-wand-magic-sparkles text-brand-600"></i> AI Recommend SMS
        </button>
      </td>
    </tr>
  `).join('');
}

function filterCustomers() {
  const query = document.getElementById('customerSearchInput').value.toLowerCase();
  const filtered = allCustomers.filter(c => c.name.toLowerCase().includes(query) || c.phone.includes(query));
  renderCustomersTable(filtered);
}

// ================= AI RECOMMENDATION & SMS =================
async function openAiRecommendationModal(customerId) {
  const customer = allCustomers.find(c => c.id === customerId);
  if (!customer) return;

  currentTargetCustomer = customer;
  document.getElementById('aiModalCustomerName').innerText = `Targeting ${customer.name} (${customer.segment} • ${customer.phone})`;
  document.getElementById('aiModal').classList.remove('hidden');
  document.getElementById('aiLoadingState').classList.remove('hidden');
  document.getElementById('aiResultState').classList.add('hidden');

  try {
    const res = await fetch(`/api/ai/recommend/${customerId}`);
    const data = await res.json();
    if (data.success) {
      currentAiRecommendation = data.recommendation;
      
      document.getElementById('aiProdImg').src = currentAiRecommendation.productImage;
      document.getElementById('aiProdCategory').innerText = currentAiRecommendation.category;
      document.getElementById('aiProdName').innerText = currentAiRecommendation.productName;
      document.getElementById('aiProdPrice').innerText = Number(currentAiRecommendation.productPrice).toLocaleString('en-IN');
      document.getElementById('aiDiscountBadge').innerText = currentAiRecommendation.discountCode;
      document.getElementById('aiReasoningText').innerText = currentAiRecommendation.reasoning;
      document.getElementById('aiSmsText').value = currentAiRecommendation.smsMessage;

      updateCharCount();
      document.getElementById('aiLoadingState').classList.add('hidden');
      document.getElementById('aiResultState').classList.remove('hidden');
    }
  } catch (err) {
    alert('Error generating recommendation: ' + err.message);
    closeAiModal();
  }
}

function updateCharCount() {
  const text = document.getElementById('aiSmsText').value;
  const count = text.length;
  document.getElementById('aiSmsCharCount').innerText = `${count} / 160 chars`;
}

function closeAiModal() {
  document.getElementById('aiModal').classList.add('hidden');
}

async function dispatchGeneratedSMS() {
  if (!currentTargetCustomer || !currentAiRecommendation) return;

  const finalMessage = document.getElementById('aiSmsText').value;
  try {
    const res = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: currentTargetCustomer.id,
        customerName: currentTargetCustomer.name,
        phone: currentTargetCustomer.phone,
        productId: currentAiRecommendation.productId,
        productName: currentAiRecommendation.productName,
        message: finalMessage,
        discountCode: currentAiRecommendation.discountCode
      })
    });

    const data = await res.json();
    if (data.success) {
      closeAiModal();
      // Update Live Phone Mockup
      document.getElementById('livePhoneMessage').innerText = finalMessage;
      document.getElementById('livePhoneCharCount').innerText = finalMessage.length;
      switchTab('campaigns');
      loadCampaigns();
    }
  } catch (err) {
    alert('Failed to dispatch SMS: ' + err.message);
  }
}

// ================= CAMPAIGNS LEDGER =================
async function loadCampaigns() {
  try {
    const res = await fetch('/api/campaigns');
    const data = await res.json();
    if (data.success) {
      const tbody = document.getElementById('campaignsTableBody');
      if (data.campaigns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400">No SMS campaigns logged yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.campaigns.map(c => `
        <tr class="hover:bg-slate-50 transition">
          <td class="px-4 py-3">
            <p class="font-semibold text-slate-900">${c.customerName}</p>
            <p class="text-xs font-mono text-slate-500">${c.phone}</p>
          </td>
          <td class="px-4 py-3 font-medium text-slate-800 text-xs">${c.productName}</td>
          <td class="px-4 py-3 text-xs text-slate-600 max-w-xs truncate" title="${c.message}">${c.message}</td>
          <td class="px-4 py-3">
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <i class="fa-solid fa-check mr-1"></i>${c.status}
            </span>
          </td>
          <td class="px-4 py-3 text-xs text-slate-400">${new Date(c.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading campaigns:', err);
  }
}

async function triggerBulkCampaign(segment) {
  if (!confirm(`Dispatch automated AI recommendation SMS to all customers in the '${segment}' segment?`)) return;

  try {
    const res = await fetch('/api/sms/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segment })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Successfully dispatched AI recommendations to ${data.count} customers!`);
      loadCampaigns();
      switchTab('campaigns');
    }
  } catch (err) {
    alert('Error running bulk campaign: ' + err.message);
  }
}
