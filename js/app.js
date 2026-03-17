/* ============================================================
   ÉDITO — Store Application
   Full dynamic store: cart, wishlist, quick view, filters
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
const state = {
  products: PRODUCTS,
  cart: [],
  wishlist: [],
  activeCategory: 'all',
  filters: {
    priceMin: 0,
    priceMax: 400,
    sizes: [],
    colors: [],
  },
  sort: 'featured',
  searchQuery: '',
  cartOpen: false,
  wishlistOpen: false,
  modalOpen: false,
  filtersOpen: false,
  quickViewProduct: null,
  quickViewColor: null,
  quickViewSize: null,
  _cartIdCounter: 0,
};

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  populateFilterOptions();
  renderProducts();
  renderCart();
  renderWishlist();
  updateBadges();
  bindEvents();
  initNav();
  initPriceRange();
});

/* ─────────────────────────────────────────
   STORAGE
───────────────────────────────────────── */
function saveToStorage() {
  try {
    localStorage.setItem('edito_cart', JSON.stringify(state.cart));
    localStorage.setItem('edito_wishlist', JSON.stringify(state.wishlist));
    localStorage.setItem('edito_cart_counter', String(state._cartIdCounter));
  } catch (_) {}
}

function loadFromStorage() {
  try {
    const cart = localStorage.getItem('edito_cart');
    const wishlist = localStorage.getItem('edito_wishlist');
    const counter = localStorage.getItem('edito_cart_counter');
    if (cart) state.cart = JSON.parse(cart);
    if (wishlist) state.wishlist = JSON.parse(wishlist);
    if (counter) state._cartIdCounter = parseInt(counter) || 0;
  } catch (_) {
    state.cart = [];
    state.wishlist = [];
  }
}

/* ─────────────────────────────────────────
   PRODUCTS / FILTERING
───────────────────────────────────────── */
function getFilteredProducts() {
  let list = [...state.products];

  // Category
  if (state.activeCategory !== 'all') {
    if (state.activeCategory === 'sale') {
      list = list.filter(p => p.isSale);
    } else {
      list = list.filter(p => p.category === state.activeCategory);
    }
  }

  // Search
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.subcategory.toLowerCase().includes(q) ||
      p.colors.some(c => c.toLowerCase().includes(q))
    );
  }

  // Price
  list = list.filter(p => p.price >= state.filters.priceMin && p.price <= state.filters.priceMax);

  // Sizes
  if (state.filters.sizes.length > 0) {
    list = list.filter(p =>
      state.filters.sizes.some(s => p.sizes.includes(s))
    );
  }

  // Colors
  if (state.filters.colors.length > 0) {
    list = list.filter(p =>
      state.filters.colors.some(c => p.colors.includes(c))
    );
  }

  // Sort
  switch (state.sort) {
    case 'newest':
      list = list.filter(p => p.isNew).concat(list.filter(p => !p.isNew));
      break;
    case 'price-asc':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'featured':
    default:
      list = list.filter(p => p.featured).concat(list.filter(p => !p.featured));
      break;
  }

  return list;
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  const emptyState = document.getElementById('emptyState');
  const countEl = document.getElementById('productCount');

  const products = getFilteredProducts();
  countEl.textContent = `${products.length} Product${products.length !== 1 ? 's' : ''}`;

  if (products.length === 0) {
    grid.innerHTML = '';
    grid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  grid.style.display = 'grid';
  emptyState.style.display = 'none';

  grid.innerHTML = products.map(p => productCardHTML(p)).join('');
  renderActiveFilterTags();
  updateActiveFilterCount();
}

function productCardHTML(p) {
  const wishlisted = state.wishlist.includes(p.id);
  const primaryColor = p.colors[0];
  const salePercent = p.originalPrice
    ? Math.round((1 - p.price / p.originalPrice) * 100)
    : null;

  const badges = [];
  if (p.isNew) badges.push('<span class="badge badge--new">New</span>');
  if (p.isSale) badges.push(`<span class="badge badge--sale">−${salePercent}%</span>`);
  if (p.isBestseller) badges.push('<span class="badge badge--bestseller">Bestseller</span>');

  const colorDots = p.colors.map((c, i) => `
    <span
      class="color-dot${i === 0 ? ' active' : ''}"
      style="background:${COLOR_MAP[c] || c}"
      data-color="${c}"
      data-product-id="${p.id}"
      data-action="switch-color"
      title="${c}"
    ></span>
  `).join('');

  const sizeBtns = p.sizes.slice(0, 5).map(s => `
    <button class="quick-size-btn" data-size="${s}" data-product-id="${p.id}" data-action="select-quick-size">${s}</button>
  `).join('');

  return `
    <article class="product-card" data-product-id="${p.id}">
      <div class="product-card__image" data-action="quick-view" data-product-id="${p.id}">
        <div class="product-card__img-primary">
          <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
        </div>
        <div class="product-card__img-secondary">
          <img src="${p.images[1]}" alt="${p.name} — alternate view" loading="lazy">
        </div>
        <div class="product-card__badges">${badges.join('')}</div>
        <div class="product-card__actions">
          <button class="product-card__action-btn${wishlisted ? ' wishlisted' : ''}" data-action="toggle-wishlist" data-product-id="${p.id}" aria-label="${wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${wishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button class="product-card__action-btn" data-action="quick-view" data-product-id="${p.id}" aria-label="Quick view">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <div class="product-card__quick-add">
          <div class="product-card__sizes">${sizeBtns}</div>
          <button class="quick-add-confirm" data-action="quick-add" data-product-id="${p.id}">Add to Bag</button>
        </div>
      </div>
      <div class="product-card__info">
        <p class="product-card__brand">${p.subcategory}</p>
        <p class="product-card__name" data-action="quick-view" data-product-id="${p.id}">${p.name}</p>
        <div class="product-card__price-row">
          <span class="product-card__price${p.isSale ? ' product-card__price--sale' : ''}">€${p.price}</span>
          ${p.originalPrice ? `<span class="product-card__price-original">€${p.originalPrice}</span>` : ''}
        </div>
        <div class="product-card__colors">${colorDots}</div>
      </div>
    </article>
  `;
}

/* ─────────────────────────────────────────
   FILTER OPTIONS
───────────────────────────────────────── */
function populateFilterOptions() {
  // Sizes
  const allSizes = [...new Set(PRODUCTS.flatMap(p => p.sizes))]
    .filter(s => s !== 'One Size')
    .sort((a, b) => {
      const order = ['XS','S','M','L','XL','XXL'];
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return parseInt(a) - parseInt(b);
    });

  document.getElementById('sizeFilters').innerHTML = allSizes.map(s => `
    <button class="filter-chip" data-size="${s}" data-action="filter-size">${s}</button>
  `).join('');

  // Colors
  const allColors = [...new Set(PRODUCTS.flatMap(p => p.colors))].sort();
  document.getElementById('colorFilters').innerHTML = allColors.map(c => `
    <button
      class="filter-color"
      style="background:${COLOR_MAP[c] || c}"
      data-color="${c}"
      data-action="filter-color"
      title="${c}"
    ></button>
  `).join('');
}

function renderActiveFilterTags() {
  const container = document.getElementById('activeTags');
  const tags = [];

  if (state.searchQuery.trim()) {
    tags.push({ label: `"${state.searchQuery}"`, action: 'clear-search' });
  }
  if (state.filters.priceMin > 0 || state.filters.priceMax < 400) {
    tags.push({ label: `€${state.filters.priceMin}–€${state.filters.priceMax}`, action: 'clear-price' });
  }
  state.filters.sizes.forEach(s => {
    tags.push({ label: s, action: 'clear-size', value: s });
  });
  state.filters.colors.forEach(c => {
    tags.push({ label: c, action: 'clear-color', value: c });
  });

  container.innerHTML = tags.map(t => `
    <span class="active-tag">
      ${t.label}
      <button data-action="${t.action}" data-value="${t.value || ''}">×</button>
    </span>
  `).join('');
}

function updateActiveFilterCount() {
  let count = 0;
  if (state.filters.priceMin > 0 || state.filters.priceMax < 400) count++;
  count += state.filters.sizes.length;
  count += state.filters.colors.length;
  if (state.searchQuery.trim()) count++;

  const countEl = document.getElementById('activeFilterCount');
  const btn = document.getElementById('filtersToggle');
  if (count > 0) {
    countEl.textContent = count;
    countEl.style.display = 'flex';
    btn.classList.add('active');
  } else {
    countEl.style.display = 'none';
    btn.classList.remove('active');
  }
}

/* ─────────────────────────────────────────
   CART
───────────────────────────────────────── */
function addToCart(productId, size, color) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const resolvedSize = size || product.sizes[0];
  const resolvedColor = color || product.colors[0];

  // Check if already in cart with same size/color
  const existing = state.cart.find(
    item => item.productId === productId && item.size === resolvedSize && item.color === resolvedColor
  );

  if (existing) {
    existing.qty += 1;
  } else {
    state._cartIdCounter++;
    state.cart.push({
      cartId: state._cartIdCounter,
      productId,
      size: resolvedSize,
      color: resolvedColor,
      qty: 1,
    });
  }

  saveToStorage();
  renderCart();
  updateBadges();
  openCart();
  showToast(`${product.name} added to bag`, 'success');
}

function removeFromCart(cartId) {
  state.cart = state.cart.filter(item => item.cartId !== cartId);
  saveToStorage();
  renderCart();
  updateBadges();
}

function updateCartQty(cartId, delta) {
  const item = state.cart.find(i => i.cartId === cartId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(cartId);
    return;
  }
  saveToStorage();
  renderCart();
  updateBadges();
}

function getCartTotal() {
  return state.cart.reduce((sum, item) => {
    const p = PRODUCTS.find(x => x.id === item.productId);
    return p ? sum + p.price * item.qty : sum;
  }, 0);
}

function getCartCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function renderCart() {
  const itemsEl = document.getElementById('cartItems');
  const emptyEl = document.getElementById('cartEmpty');
  const footerEl = document.getElementById('cartFooter');
  const countEl = document.getElementById('cartItemCount');

  const count = getCartCount();
  countEl.textContent = `(${count})`;

  if (state.cart.length === 0) {
    emptyEl.style.display = 'flex';
    itemsEl.innerHTML = '';
    footerEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  footerEl.style.display = 'flex';

  itemsEl.innerHTML = state.cart.map(item => {
    const p = PRODUCTS.find(x => x.id === item.productId);
    if (!p) return '';
    return `
      <div class="cart-item">
        <div class="cart-item__image">
          <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
        </div>
        <div class="cart-item__details">
          <p class="cart-item__name">${p.name}</p>
          <p class="cart-item__meta">${item.color} · Size ${item.size}</p>
          <div class="cart-item__price-row">
            <span class="cart-item__price">€${(p.price * item.qty).toFixed(2)}</span>
            <div class="cart-item__qty">
              <button class="qty-btn" data-action="cart-qty-dec" data-cart-id="${item.cartId}">−</button>
              <span class="qty-val">${item.qty}</span>
              <button class="qty-btn" data-action="cart-qty-inc" data-cart-id="${item.cartId}">+</button>
            </div>
          </div>
          <button class="cart-item__remove" data-action="cart-remove" data-cart-id="${item.cartId}">Remove</button>
        </div>
      </div>
    `;
  }).join('');

  const total = getCartTotal();
  const shipping = total >= 150 ? 'Free' : '€8.00';
  document.getElementById('cartSubtotal').textContent = `€${total.toFixed(2)}`;
  document.getElementById('cartShipping').textContent = shipping;
  document.getElementById('cartTotal').textContent = shipping === 'Free'
    ? `€${total.toFixed(2)}`
    : `€${(total + 8).toFixed(2)}`;
}

/* ─────────────────────────────────────────
   WISHLIST
───────────────────────────────────────── */
function toggleWishlist(productId) {
  const idx = state.wishlist.indexOf(productId);
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  if (idx > -1) {
    state.wishlist.splice(idx, 1);
    showToast(`${product.name} removed from wishlist`, 'wishlist');
  } else {
    state.wishlist.push(productId);
    showToast(`${product.name} saved to wishlist`, 'wishlist');
  }

  saveToStorage();
  renderWishlist();
  updateBadges();

  // Update all wishlist buttons in grid
  document.querySelectorAll(`[data-action="toggle-wishlist"][data-product-id="${productId}"]`).forEach(btn => {
    const isWishlisted = state.wishlist.includes(productId);
    btn.classList.toggle('wishlisted', isWishlisted);
    btn.setAttribute('aria-label', isWishlisted ? 'Remove from wishlist' : 'Add to wishlist');
    const svg = btn.querySelector('path');
    if (svg) svg.setAttribute('fill', isWishlisted ? 'currentColor' : 'none');
  });

  // Update quick view button if open
  const qvWishBtn = document.getElementById('qvWishlistBtn');
  if (qvWishBtn && state.quickViewProduct && state.quickViewProduct.id === productId) {
    const isWishlisted = state.wishlist.includes(productId);
    qvWishBtn.classList.toggle('wishlisted', isWishlisted);
    qvWishBtn.querySelector('span').textContent = isWishlisted ? 'Saved to Wishlist' : 'Add to Wishlist';
    const svg = qvWishBtn.querySelector('path');
    if (svg) svg.setAttribute('fill', isWishlisted ? 'currentColor' : 'none');
  }
}

function renderWishlist() {
  const itemsEl = document.getElementById('wishlistItems');
  const emptyEl = document.getElementById('wishlistEmpty');
  const countEl = document.getElementById('wishlistItemCount');

  countEl.textContent = `(${state.wishlist.length})`;

  if (state.wishlist.length === 0) {
    emptyEl.style.display = 'flex';
    itemsEl.innerHTML = '';
    return;
  }

  emptyEl.style.display = 'none';
  const products = state.wishlist
    .map(id => PRODUCTS.find(p => p.id === id))
    .filter(Boolean);

  itemsEl.innerHTML = products.map(p => `
    <div class="wishlist-item">
      <div class="wishlist-item__image">
        <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
      </div>
      <div class="wishlist-item__info">
        <p class="wishlist-item__name">${p.name}</p>
        <p class="wishlist-item__price">€${p.price}${p.originalPrice ? ` <s style="color:var(--mid)">€${p.originalPrice}</s>` : ''}</p>
      </div>
      <div class="wishlist-item__actions">
        <button class="wishlist-item__add" data-action="wishlist-add-to-cart" data-product-id="${p.id}" title="Add to bag">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </button>
        <button class="wishlist-item__remove" data-action="toggle-wishlist" data-product-id="${p.id}" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

/* ─────────────────────────────────────────
   QUICK VIEW
───────────────────────────────────────── */
function openQuickView(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  state.quickViewProduct = product;
  state.quickViewColor = product.colors[0];
  state.quickViewSize = null;

  renderQuickView(product);
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
  state.modalOpen = true;
}

function renderQuickView(product) {
  const isWishlisted = state.wishlist.includes(product.id);
  const salePercent = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  const colorBtns = product.colors.map((c, i) => `
    <button
      class="qv-color-btn${i === 0 ? ' active' : ''}"
      style="background:${COLOR_MAP[c] || c}"
      data-color="${c}"
      data-action="qv-select-color"
      title="${c}"
    ></button>
  `).join('');

  const sizeBtns = product.sizes.map(s => `
    <button class="qv-size-btn" data-size="${s}" data-action="qv-select-size">${s}</button>
  `).join('');

  document.getElementById('quickViewContent').innerHTML = `
    <div class="qv-gallery">
      <div class="qv-gallery__main" id="qvGalleryMain">
        <img src="${product.images[0]}" alt="${product.name}" id="qvMainImage" loading="lazy" style="width:100%;height:100%;object-fit:cover">
      </div>
      <div class="qv-gallery__thumbs">
        ${product.images.map((_, i) => `<span class="qv-thumb${i === 0 ? ' active' : ''}" data-index="${i}" data-action="qv-thumb"></span>`).join('')}
      </div>
    </div>
    <div class="qv-details">
      <p class="qv-details__category">${product.subcategory}</p>
      <h2 class="qv-details__name">${product.name}</h2>
      <div class="qv-details__price-row">
        <span class="qv-details__price${product.isSale ? ' qv-details__price--sale' : ''}">€${product.price}</span>
        ${product.originalPrice ? `<span class="qv-details__price-og">€${product.originalPrice}</span>` : ''}
        ${salePercent ? `<span class="badge badge--sale">−${salePercent}%</span>` : ''}
      </div>
      <div class="qv-divider"></div>
      <p class="qv-section-label">Color — <span id="qvColorLabel" style="font-weight:400;text-transform:none;letter-spacing:0">${product.colors[0]}</span></p>
      <div class="qv-colors">${colorBtns}</div>
      <p class="qv-section-label">Size</p>
      <div class="qv-sizes">${sizeBtns}</div>
      <p class="qv-details__desc">${product.description}</p>
      <div class="qv-actions">
        <button class="btn btn--primary btn--full" id="qvAddToCartBtn" data-action="qv-add-to-cart" data-product-id="${product.id}">
          Add to Bag
        </button>
        <button class="qv-wishlist-btn${isWishlisted ? ' wishlisted' : ''}" id="qvWishlistBtn" data-action="toggle-wishlist" data-product-id="${product.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>${isWishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}</span>
        </button>
      </div>
    </div>
  `;
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  if (!state.cartOpen && !state.wishlistOpen) {
    document.getElementById('overlay').classList.remove('visible');
    document.body.style.overflow = '';
  }
  state.modalOpen = false;
  state.quickViewProduct = null;
}

/* ─────────────────────────────────────────
   CART / WISHLIST DRAWERS
───────────────────────────────────────── */
function openCart() {
  if (state.wishlistOpen) closeWishlist();
  state.cartOpen = true;
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  state.cartOpen = false;
  document.getElementById('cartDrawer').classList.remove('open');
  if (!state.wishlistOpen && !state.modalOpen) {
    document.getElementById('overlay').classList.remove('visible');
    document.body.style.overflow = '';
  }
}

function openWishlist() {
  if (state.cartOpen) closeCart();
  state.wishlistOpen = true;
  document.getElementById('wishlistDrawer').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeWishlist() {
  state.wishlistOpen = false;
  document.getElementById('wishlistDrawer').classList.remove('open');
  if (!state.cartOpen && !state.modalOpen) {
    document.getElementById('overlay').classList.remove('visible');
    document.body.style.overflow = '';
  }
}

/* ─────────────────────────────────────────
   BADGES
───────────────────────────────────────── */
function updateBadges() {
  const cartCount = getCartCount();
  const cartBadge = document.getElementById('cartBadge');
  cartBadge.textContent = cartCount;
  cartBadge.style.display = cartCount > 0 ? 'flex' : 'none';

  const wishCount = state.wishlist.length;
  const wishBadge = document.getElementById('wishlistBadge');
  wishBadge.textContent = wishCount;
  wishBadge.style.display = wishCount > 0 ? 'flex' : 'none';
}

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
function showToast(message, type = '') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast${type ? ` toast--${type}` : ''}`;

  const icon = type === 'success'
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
    : type === 'wishlist'
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
    : '';

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

/* ─────────────────────────────────────────
   PRICE RANGE
───────────────────────────────────────── */
function initPriceRange() {
  const minInput = document.getElementById('priceMin');
  const maxInput = document.getElementById('priceMax');
  const fill = document.getElementById('priceRangeFill');

  function updateFill() {
    const min = parseInt(minInput.value);
    const max = parseInt(maxInput.value);
    const range = parseInt(minInput.max) - parseInt(minInput.min);
    const leftPct = ((min - parseInt(minInput.min)) / range) * 100;
    const rightPct = ((parseInt(maxInput.max) - max) / range) * 100;
    fill.style.left = `${leftPct}%`;
    fill.style.right = `${rightPct}%`;
    document.getElementById('priceMinLabel').textContent = `€${min}`;
    document.getElementById('priceMaxLabel').textContent = max >= 400 ? '€400+' : `€${max}`;
    state.filters.priceMin = min;
    state.filters.priceMax = max;
  }

  minInput.addEventListener('input', () => {
    if (parseInt(minInput.value) > parseInt(maxInput.value) - 10) {
      minInput.value = parseInt(maxInput.value) - 10;
    }
    updateFill();
  });

  maxInput.addEventListener('input', () => {
    if (parseInt(maxInput.value) < parseInt(minInput.value) + 10) {
      maxInput.value = parseInt(minInput.value) + 10;
    }
    updateFill();
  });

  updateFill();
}

/* ─────────────────────────────────────────
   NAV SCROLL
───────────────────────────────────────── */
function initNav() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });
}

/* ─────────────────────────────────────────
   SEARCH
───────────────────────────────────────── */
let searchDebounce;
function handleSearchInput(e) {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.searchQuery = e.target.value;
    renderProducts();
    if (state.searchQuery.trim()) {
      document.getElementById('shop').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 250);
}

/* ─────────────────────────────────────────
   CATEGORY NAV
───────────────────────────────────────── */
function setCategory(cat) {
  state.activeCategory = cat;

  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === cat);
  });

  const titles = { all: 'All Pieces', women: "Women's Collection", men: "Men's Collection", accessories: 'Accessories', sale: 'Sale' };
  document.getElementById('shopTitle').textContent = titles[cat] || 'All Pieces';

  renderProducts();
}

/* ─────────────────────────────────────────
   RESET FILTERS
───────────────────────────────────────── */
function resetFilters() {
  state.filters = { priceMin: 0, priceMax: 400, sizes: [], colors: [] };
  state.searchQuery = '';

  document.getElementById('priceMin').value = 0;
  document.getElementById('priceMax').value = 400;
  initPriceRange();
  document.getElementById('searchInput').value = '';

  document.querySelectorAll('.filter-chip.active').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.filter-color.active').forEach(el => el.classList.remove('active'));

  renderProducts();
}

/* ─────────────────────────────────────────
   EVENT BINDING
───────────────────────────────────────── */
function bindEvents() {
  // --- Nav links (category filter) ---
  document.querySelectorAll('[data-filter-category]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const cat = el.dataset.filterCategory;
      setCategory(cat);
      document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // --- Category pills ---
  document.getElementById('categoryNav').addEventListener('click', e => {
    const pill = e.target.closest('.cat-pill');
    if (pill) setCategory(pill.dataset.category);
  });

  // --- Cart toggle ---
  document.getElementById('cartToggle').addEventListener('click', () => {
    state.cartOpen ? closeCart() : openCart();
  });
  document.getElementById('cartClose').addEventListener('click', closeCart);

  // --- Wishlist toggle ---
  document.getElementById('wishlistToggle').addEventListener('click', () => {
    state.wishlistOpen ? closeWishlist() : openWishlist();
  });
  document.getElementById('wishlistClose').addEventListener('click', closeWishlist);

  // --- Overlay close ---
  document.getElementById('overlay').addEventListener('click', () => {
    closeCart();
    closeWishlist();
    closeModal();
  });

  // --- Search ---
  document.getElementById('searchToggle').addEventListener('click', () => {
    document.getElementById('searchBar').classList.add('open');
    document.getElementById('searchInput').focus();
  });
  document.getElementById('searchClose').addEventListener('click', () => {
    document.getElementById('searchBar').classList.remove('open');
    state.searchQuery = '';
    document.getElementById('searchInput').value = '';
    renderProducts();
  });
  document.getElementById('searchInput').addEventListener('input', handleSearchInput);
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Escape') document.getElementById('searchClose').click();
  });

  // --- Sort ---
  document.getElementById('sortSelect').addEventListener('change', e => {
    state.sort = e.target.value;
    renderProducts();
  });

  // --- Filters toggle ---
  document.getElementById('filtersToggle').addEventListener('click', () => {
    state.filtersOpen = !state.filtersOpen;
    document.getElementById('filtersPanel').classList.toggle('open', state.filtersOpen);
    document.getElementById('filtersToggle').classList.toggle('active', state.filtersOpen);
  });

  // --- Filters apply ---
  document.getElementById('filtersApply').addEventListener('click', () => {
    renderProducts();
    state.filtersOpen = false;
    document.getElementById('filtersPanel').classList.remove('open');
    document.getElementById('filtersToggle').classList.remove('active');
  });

  // --- Filters reset ---
  document.getElementById('filtersReset').addEventListener('click', resetFilters);
  document.getElementById('clearAllFilters').addEventListener('click', () => {
    setCategory('all');
    resetFilters();
  });

  // --- Modal close ---
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // --- Checkout (fake) ---
  document.getElementById('checkoutBtn').addEventListener('click', () => {
    showToast('Redirecting to secure checkout…', 'success');
  });

  // --- Newsletter ---
  document.getElementById('newsletterForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('newsletterEmail').value;
    if (email) {
      showToast('Thank you for subscribing!', 'success');
      document.getElementById('newsletterEmail').value = '';
    }
  });

  // --- Product grid (delegated) ---
  document.getElementById('productGrid').addEventListener('click', handleGridClick);
  document.getElementById('productGrid').addEventListener('mouseleave', handleGridMouseLeave, true);

  // --- Cart drawer (delegated) ---
  document.getElementById('cartItems').addEventListener('click', handleCartClick);

  // --- Wishlist drawer (delegated) ---
  document.getElementById('wishlistItems').addEventListener('click', handleWishlistClick);

  // --- Quick view modal (delegated) ---
  document.getElementById('quickViewContent').addEventListener('click', handleModalClick);

  // --- Active tags (delegated) ---
  document.getElementById('activeTags').addEventListener('click', handleTagClick);

  // --- Filter chips ---
  document.getElementById('sizeFilters').addEventListener('click', e => {
    const chip = e.target.closest('[data-action="filter-size"]');
    if (!chip) return;
    const size = chip.dataset.size;
    chip.classList.toggle('active');
    const idx = state.filters.sizes.indexOf(size);
    if (idx > -1) state.filters.sizes.splice(idx, 1);
    else state.filters.sizes.push(size);
    renderProducts();
  });

  document.getElementById('colorFilters').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="filter-color"]');
    if (!btn) return;
    const color = btn.dataset.color;
    btn.classList.toggle('active');
    const idx = state.filters.colors.indexOf(color);
    if (idx > -1) state.filters.colors.splice(idx, 1);
    else state.filters.colors.push(color);
    renderProducts();
  });

  // --- Escape key ---
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (state.modalOpen) closeModal();
      else if (state.cartOpen) closeCart();
      else if (state.wishlistOpen) closeWishlist();
      else {
        const searchBar = document.getElementById('searchBar');
        if (searchBar.classList.contains('open')) document.getElementById('searchClose').click();
      }
    }
  });
}

/* ─────────────────────────────────────────
   DELEGATED HANDLERS
───────────────────────────────────────── */
function handleGridClick(e) {
  const target = e.target;
  const actionEl = target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;
  const productId = parseInt(actionEl.dataset.productId);

  switch (action) {
    case 'quick-view':
      openQuickView(productId);
      break;

    case 'toggle-wishlist':
      e.stopPropagation();
      toggleWishlist(productId);
      break;

    case 'select-quick-size': {
      e.stopPropagation();
      const card = actionEl.closest('.product-card');
      card.querySelectorAll('.quick-size-btn').forEach(b => b.classList.remove('selected'));
      actionEl.classList.add('selected');
      break;
    }

    case 'quick-add': {
      e.stopPropagation();
      const card = actionEl.closest('.product-card');
      const selectedSizeBtn = card.querySelector('.quick-size-btn.selected');
      const size = selectedSizeBtn ? selectedSizeBtn.dataset.size : null;
      const product = PRODUCTS.find(p => p.id === productId);
      const activeColorDot = card.querySelector('.color-dot.active');
      const color = activeColorDot ? activeColorDot.dataset.color : (product ? product.colors[0] : null);
      addToCart(productId, size, color);
      break;
    }

    case 'switch-color': {
      e.stopPropagation();
      const card = actionEl.closest('.product-card');
      card.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      actionEl.classList.add('active');
      // Switch card image
      const newImg = `https://picsum.photos/seed/${actionEl.dataset.color.toLowerCase()}-${productId}/600/800`;
      const primaryImg = card.querySelector('.product-card__img-primary img');
      if (primaryImg) primaryImg.src = newImg;
      break;
    }
  }
}

function handleGridMouseLeave() {
  // Reset selected size buttons
  document.querySelectorAll('.quick-size-btn.selected').forEach(b => b.classList.remove('selected'));
}

function handleCartClick(e) {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  const cartId = parseInt(actionEl.dataset.cartId);

  if (action === 'cart-remove') removeFromCart(cartId);
  else if (action === 'cart-qty-dec') updateCartQty(cartId, -1);
  else if (action === 'cart-qty-inc') updateCartQty(cartId, 1);
}

function handleWishlistClick(e) {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  const productId = parseInt(actionEl.dataset.productId);

  if (action === 'toggle-wishlist') {
    toggleWishlist(productId);
    renderWishlist();
  } else if (action === 'wishlist-add-to-cart') {
    const product = PRODUCTS.find(p => p.id === productId);
    addToCart(productId, product ? product.sizes[0] : null, product ? product.colors[0] : null);
  }
}

function handleModalClick(e) {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;

  switch (action) {
    case 'qv-select-color': {
      const color = actionEl.dataset.color;
      state.quickViewColor = color;
      document.querySelectorAll('.qv-color-btn').forEach(b => b.classList.remove('active'));
      actionEl.classList.add('active');
      document.getElementById('qvColorLabel').textContent = color;
      // Update image
      const product = state.quickViewProduct;
      if (product) {
        const img = document.getElementById('qvMainImage');
        img.src = `https://picsum.photos/seed/${color.toLowerCase()}-qv-${product.id}/600/800`;
      }
      break;
    }

    case 'qv-select-size': {
      const size = actionEl.dataset.size;
      state.quickViewSize = size;
      document.querySelectorAll('.qv-size-btn').forEach(b => b.classList.remove('active'));
      actionEl.classList.add('active');
      break;
    }

    case 'qv-add-to-cart': {
      const productId = parseInt(actionEl.dataset.productId);
      if (!state.quickViewSize) {
        showToast('Please select a size', 'error');
        document.querySelectorAll('.qv-size-btn').forEach(b => {
          b.style.animation = 'none';
          b.offsetHeight; // reflow
          b.style.animation = 'shake 0.3s ease';
        });
        return;
      }
      addToCart(productId, state.quickViewSize, state.quickViewColor);
      closeModal();
      break;
    }

    case 'toggle-wishlist': {
      const productId = parseInt(actionEl.dataset.productId);
      toggleWishlist(productId);
      break;
    }

    case 'qv-thumb': {
      const index = parseInt(actionEl.dataset.index);
      const product = state.quickViewProduct;
      if (!product) return;
      const mainImg = document.getElementById('qvMainImage');
      mainImg.src = product.images[index] || product.images[0];
      document.querySelectorAll('.qv-thumb').forEach(t => t.classList.remove('active'));
      actionEl.classList.add('active');
      break;
    }
  }
}

function handleTagClick(e) {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  const value = actionEl.dataset.value;

  switch (action) {
    case 'clear-search':
      state.searchQuery = '';
      document.getElementById('searchInput').value = '';
      break;
    case 'clear-price':
      state.filters.priceMin = 0;
      state.filters.priceMax = 400;
      document.getElementById('priceMin').value = 0;
      document.getElementById('priceMax').value = 400;
      initPriceRange();
      break;
    case 'clear-size': {
      const idx = state.filters.sizes.indexOf(value);
      if (idx > -1) state.filters.sizes.splice(idx, 1);
      document.querySelectorAll(`[data-action="filter-size"][data-size="${value}"]`).forEach(el => el.classList.remove('active'));
      break;
    }
    case 'clear-color': {
      const idx = state.filters.colors.indexOf(value);
      if (idx > -1) state.filters.colors.splice(idx, 1);
      document.querySelectorAll(`[data-action="filter-color"][data-color="${value}"]`).forEach(el => el.classList.remove('active'));
      break;
    }
  }

  renderProducts();
}
