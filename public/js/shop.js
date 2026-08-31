// ============================================================
// Customer Store Logic
// ============================================================

let currentUser = null;
let allProducts = [];
let filteredProducts = [];
let cart = [];
let activeCategory = '';

// Init
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('SAM_user');
  if (saved) {
    currentUser = JSON.parse(saved);
    document.getElementById('userGreeting').classList.remove('hidden');
    document.getElementById('greetingName').textContent = `Hi, ${currentUser.name.split(' ')[0]}!`;
    document.getElementById('loginBtn').textContent = 'Logout';
    document.getElementById('loginBtn').href = '#';
    document.getElementById('loginBtn').onclick = () => {
      localStorage.removeItem('SAM_user');
      window.location.reload();
    };
  }

  const savedCart = localStorage.getItem('SAM_cart');
  if (savedCart) cart = JSON.parse(savedCart);
  updateCartUI();
  loadProducts();
});

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2500);
}

// ===== PRODUCTS =====
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    allProducts = data.products || [];
    filteredProducts = [...allProducts];
    buildCategoryBar();
    renderProducts(filteredProducts);
  } catch (e) {
    document.getElementById('productsGrid').innerHTML = '<p class="col-span-full text-center text-slate-400 py-12">Failed to load products</p>';
  }
}

function buildCategoryBar() {
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const bar = document.getElementById('categoryBar');
  const existing = bar.querySelector('[data-cat=""]');
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.onclick = () => filterByCategory(cat);
    btn.setAttribute('data-cat', cat);
    btn.className = 'cat-btn flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium bg-[#111] text-gray-400 hover:text-white transition';
    btn.textContent = cat;
    bar.appendChild(btn);
  });
}

function filterByCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.className = 'cat-btn flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium ' +
      (b.getAttribute('data-cat') === cat
        ? 'bg-[#ff4b1f] text-white'
        : 'bg-[#111] text-gray-400 hover:text-white') +
      ' transition';
  });
  applyFilters();
}

function filterProducts() {
  applyFilters();
}

function applyFilters() {
  const query = (document.getElementById('searchInput').value || '').toLowerCase();
  filteredProducts = allProducts.filter(p => {
    const matchCat = !activeCategory || p.category === activeCategory;
    const matchQ = !query || p.name.toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query);
    return matchCat && matchQ;
  });
  sortProducts();
}

function sortProducts() {
  const sort = document.getElementById('sortSelect').value;
  const arr = [...filteredProducts];
  if (sort === 'price-asc') arr.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') arr.sort((a, b) => b.price - a.price);
  else if (sort === 'name') arr.sort((a, b) => a.name.localeCompare(b.name));
  renderProducts(arr);
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');

  if (!products.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = products.map(p => {
    return `
      <div class="product-card bg-[#111] rounded-[24px] p-6 border border-[#1a1a1a] cursor-pointer" onclick="addToCart(${p.id})">
        <div class="text-left mb-2">
          <h3 class="text-white text-[17px] font-medium tracking-wide mb-1">${p.name}</h3>
          <div class="text-[#ff4b1f] text-[13px]">${p.category || 'Mid-Range'}</div>
        </div>
        <div class="relative h-48 flex items-center justify-center my-6">
          <img src="${p.imageUrl || 'https://via.placeholder.com/300x300?text=PC'}"
            alt="${p.name}" class="max-h-full max-w-full object-contain"
            onerror="this.src='https://via.placeholder.com/300x300?text=PC'">
        </div>
        <div class="text-left mt-4">
          <div class="text-gray-500 text-[11px] mb-0.5">starts</div>
          <div class="text-white font-bold text-[19px]">₹${p.price.toLocaleString()}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== CART =====
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product || product.stock === 0) return;

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, qty: 1 });
  }
  localStorage.setItem('SAM_cart', JSON.stringify(cart));
  updateCartUI();
  showToast(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  localStorage.setItem('SAM_cart', JSON.stringify(cart));
  updateCartUI();
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(productId);
  else {
    localStorage.setItem('SAM_cart', JSON.stringify(cart));
    updateCartUI();
  }
}

function updateCartUI() {
  const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = cart.reduce((sum, i) => sum + i.qty * i.price, 0);

  // Cart count badge
  const countEl = document.getElementById('cartCount');
  if (totalQty > 0) {
    countEl.textContent = totalQty;
    countEl.classList.remove('hidden');
  } else {
    countEl.classList.add('hidden');
  }
  document.getElementById('cartCountBadge').textContent = totalQty ? `(${totalQty} item${totalQty > 1 ? 's' : ''})` : '';

  // Cart items
  const cartItemsEl = document.getElementById('cartItems');
  const cartFooter = document.getElementById('cartFooter');
  const cartEmpty = document.getElementById('cartEmpty');

  if (!cart.length) {
    cartEmpty.classList.remove('hidden');
    cartFooter.classList.add('hidden');
    cartItemsEl.innerHTML = '';
    cartItemsEl.appendChild(cartEmpty);
    return;
  }
  cartEmpty.classList.add('hidden');
  cartFooter.classList.remove('hidden');

  cartItemsEl.innerHTML = cart.map(item => `
    <div class="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
      <img src="${item.imageUrl || 'https://via.placeholder.com/60?text=P'}" alt="${item.name}"
        class="w-16 h-16 object-cover rounded-xl flex-shrink-0"
        onerror="this.src='https://via.placeholder.com/60?text=P'">
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-slate-900 truncate">${item.name}</p>
        <p class="text-gray-900 font-bold text-sm">₹${item.price.toLocaleString()}</p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="changeQty(${item.id}, -1)" class="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-sm font-bold">-</button>
        <span class="w-5 text-center text-sm font-semibold">${item.qty}</span>
        <button onclick="changeQty(${item.id}, 1)" class="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-green-50 hover:text-green-500 transition text-sm font-bold">+</button>
      </div>
      <button onclick="removeFromCart(${item.id})" class="text-slate-300 hover:text-red-400 transition ml-1"><i class="fa-solid fa-trash text-sm"></i></button>
    </div>
  `).join('');

  document.getElementById('cartSubtotal').textContent = `₹${totalPrice.toLocaleString()}`;
  document.getElementById('cartTotal').textContent = `₹${totalPrice.toLocaleString()}`;
}

function toggleCart() {
  const panel = document.getElementById('cartPanel');
  const overlay = document.getElementById('cartOverlay');
  const isOpen = !panel.classList.contains('hidden-cart');
  if (isOpen) {
    panel.classList.add('hidden-cart');
    overlay.classList.add('hidden');
    overlay.style.opacity = '0';
  } else {
    panel.classList.remove('hidden-cart');
    overlay.classList.remove('hidden');
    overlay.style.opacity = '1';
  }
}

// ===== ORDER PLACEMENT =====
async function placeOrder() {
  if (!cart.length) return;

  const orderData = {
    customerId: currentUser ? currentUser.id : null,
    customerName: currentUser ? currentUser.name : 'Guest',
    items: cart.map(i => ({ productId: i.id, productName: i.name, qty: i.qty, price: i.price })),
    total: cart.reduce((sum, i) => sum + i.qty * i.price, 0)
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (data.success) {
      cart = [];
      localStorage.removeItem('SAM_cart');
      updateCartUI();
      toggleCart();
      document.getElementById('orderSuccessMsg').textContent =
        `Order #${data.orderId || 'confirmed'} placed! Total: ₹${orderData.total.toLocaleString()}. ${currentUser ? 'Watch for AI deals on your phone!' : 'Login next time to track your orders!'}`;
      document.getElementById('orderModal').classList.remove('hidden');
    } else {
      showToast('Order failed. Please try again.');
    }
  } catch (err) {
    showToast('Error placing order: ' + err.message);
  }
}
