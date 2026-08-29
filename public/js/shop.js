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
    btn.className = 'cat-btn flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-700 transition';
    btn.textContent = cat;
    bar.appendChild(btn);
  });
}

function filterByCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.className = 'cat-btn flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium ' +
      (b.getAttribute('data-cat') === cat
        ? 'bg-brand-600 text-white'
        : 'bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-700') +
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
    const discount = p.originalPrice && p.originalPrice > p.price
      ? Math.round((1 - p.price / p.originalPrice) * 100) : null;
    return `
      <div class="product-card bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer" onclick="addToCart(${p.id})">
        <div class="relative h-44 bg-slate-100 overflow-hidden">
          <img src="${p.imageUrl || 'https://via.placeholder.com/300x176?text=No+Image'}"
            alt="${p.name}" class="w-full h-full object-cover"
            onerror="this.src='https://via.placeholder.com/300x176?text=No+Image'">
          ${discount ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">${discount}% OFF</span>` : ''}
          ${p.stock <= 5 && p.stock > 0 ? `<span class="absolute top-2 right-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">Only ${p.stock} left!</span>` : ''}
          ${p.stock === 0 ? `<div class="absolute inset-0 bg-white/70 flex items-center justify-center"><span class="text-slate-500 font-bold text-sm">Out of Stock</span></div>` : ''}
        </div>
        <div class="p-3">
          <div class="text-xs text-slate-400 mb-1">${p.category || 'General'}</div>
          <h3 class="font-semibold text-slate-900 text-sm leading-tight mb-2 line-clamp-2">${p.name}</h3>
          <div class="flex items-center gap-2 mb-3">
            <span class="text-brand-600 font-bold text-base">₹${p.price.toLocaleString()}</span>
            ${p.originalPrice ? `<span class="text-xs text-slate-400 line-through">₹${p.originalPrice.toLocaleString()}</span>` : ''}
          </div>
          <button onclick="event.stopPropagation(); addToCart(${p.id})" ${p.stock === 0 ? 'disabled' : ''}
            class="w-full py-2 ${p.stock === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 text-white'} text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1">
            <i class="fa-solid fa-cart-plus"></i> Add to Cart
          </button>
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
        <p class="text-brand-600 font-bold text-sm">₹${item.price.toLocaleString()}</p>
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
