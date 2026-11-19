/**
 * SAANVI'S KITCHEN — Client-Side Core Application Script
 * Live settings synchronization, Cart management & WhatsApp order generation
 */

const APP_CONFIG = {
  defaultSettings: {
    restaurant_name: "Sanvi Kitchens",
    tagline: "Authentic Taste, Made With Love",
    phone_number: "9494608182",
    whatsapp_number: "9494608182",
    contact_number: "9494608182",
    address: "Annapoorneswari Nilayam, Old Post Office Road, Maruthi Nagar, Madiwala, Bengaluru, Karnataka, India.",
    business_type: "Dine-in and Online Orders",
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Annapoorneswari%20Nilayam%2C%20Old%20Post%20Office%20Road%2C%20Maruthi%20Nagar%2C%20Madiwala%2C%20Bengaluru%2C%20Karnataka%2C%20India"
  },
  cartStorageKey: 'saanvis_kitchen_cart_v1'
};

let currentSettings = { ...APP_CONFIG.defaultSettings };

// =======================================================================
// 1. LIVE RESTAURANT SETTINGS SYNC
// =======================================================================
async function loadRestaurantSettings() {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.settings) {
        currentSettings = { ...currentSettings, ...data.settings };
      }
    }
  } catch (err) {
    console.warn('Using baseline restaurant settings:', err.message);
  }
  applySettingsToDOM();
}

function applySettingsToDOM() {
  // 1. Update text nodes with data-setting attribute
  document.querySelectorAll('[data-setting]').forEach(el => {
    const key = el.getAttribute('data-setting');
    if (currentSettings[key]) {
      el.textContent = currentSettings[key];
    }
  });

  // 2. Update page title if appropriate
  if (document.title.includes("Saanvi") || document.title.includes("Sanvi") || document.title.includes("SAANVI") || document.title.includes("SANVI")) {
    document.title = `${currentSettings.restaurant_name} — ${currentSettings.tagline}`;
  }

  // 3. Update click-to-call links (tel:9494608182)
  const cleanPhone = (currentSettings.phone_number || '9494608182').replace(/\D/g, '');
  document.querySelectorAll('a[data-link="phone"]').forEach(el => {
    el.href = `tel:${cleanPhone}`;
    if (el.getAttribute('data-show-number') === 'true') {
      el.textContent = cleanPhone;
    }
  });

  // 4. Update WhatsApp links (https://wa.me/919494608182) with +91 country code
  const cleanWa = (currentSettings.whatsapp_number || '9494608182').replace(/\D/g, '');
  document.querySelectorAll('a[data-link="whatsapp"]').forEach(el => {
    el.href = `https://wa.me/91${cleanWa}`;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  });

  // 5. Update Google Maps search URL (target="_blank")
  const mapsUrl = currentSettings.google_maps_url || 
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentSettings.address)}`;
  document.querySelectorAll('a[data-link="directions"]').forEach(el => {
    el.href = mapsUrl;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  });
}

// =======================================================================
// 2. CART MANAGEMENT (Persistent localStorage)
// =======================================================================
function getCart() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.cartStorageKey);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(APP_CONFIG.cartStorageKey, JSON.stringify(cart));
    updateCartBadge();
    renderCartDrawer();
  } catch (e) {
    console.error('Failed to save cart to localStorage:', e);
  }
}

function addToCart(item) {
  const cart = getCart();
  const existingIndex = cart.findIndex(i => i.id === item.id || i.name === item.name);

  if (existingIndex > -1) {
    cart[existingIndex].quantity += 1;
  } else {
    cart.push({
      id: item.id || Date.now(),
      name: item.name,
      price: parseFloat(item.price),
      quantity: 1,
      image_url: item.image_url || ''
    });
  }

  saveCart(cart);
  showToast(`Added ${item.name} to cart!`);
  openCartDrawer();
}

function updateCartQuantity(itemId, delta) {
  const cart = getCart();
  const idx = cart.findIndex(i => i.id == itemId);
  if (idx > -1) {
    cart[idx].quantity += delta;
    if (cart[idx].quantity <= 0) {
      cart.splice(idx, 1);
    }
  }
  saveCart(cart);
}

function removeFromCart(itemId) {
  const cart = getCart().filter(i => i.id != itemId);
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function getCartCalculations() {
  const cart = getCart();
  let subtotal = 0;
  let totalItems = 0;

  cart.forEach(item => {
    subtotal += item.price * item.quantity;
    totalItems += item.quantity;
  });

  const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
  const grandTotal = subtotal + tax;

  return {
    cart,
    subtotal,
    tax,
    grandTotal,
    totalItems
  };
}

function updateCartBadge() {
  const { totalItems } = getCartCalculations();
  document.querySelectorAll('.cart-badge').forEach(badge => {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
  });
}

// =======================================================================
// 3. WHATSAPP ORDERING GENERATOR (Dynamic, URL-encoded)
// =======================================================================
/**
 * Generates dynamic pre-filled WhatsApp message per Section 5 specifications:
 * - Restaurant name
 * - Customer name, if provided
 * - Selected food item names & quantity
 * - Individual item totals
 * - Subtotal, applicable charges, final order total
 * - Order type (Dine-in, Takeaway, or Home Delivery)
 */
function generateWhatsAppOrderMessage(orderType = 'Takeaway', customerName = '', deliveryAddress = '', tableNo = '') {
  const { cart, subtotal, tax, grandTotal } = getCartCalculations();

  if (cart.length === 0) {
    showToast('Your cart is empty. Add food items first!', 'warning');
    return null;
  }

  const restaurantName = currentSettings.restaurant_name || "SAANVI'S KITCHEN";

  let lines = [];
  lines.push(`Hello ${restaurantName}!`);
  lines.push('');
  lines.push('I would like to place an order.');
  if (customerName && customerName.trim()) {
    lines.push(`Customer: ${customerName.trim()}`);
  }
  lines.push('');
  lines.push('Items:');

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    lines.push(`${item.name} × ${item.quantity} – ₹${itemTotal}`);
  });

  lines.push('');
  if (tax > 0) {
    lines.push(`Subtotal: ₹${subtotal}`);
    lines.push(`Taxes (5% GST): ₹${tax}`);
  }
  lines.push(`Total: ₹${grandTotal}`);
  lines.push('');
  lines.push(`Order Type: ${orderType}`);

  if (orderType === 'Dine-in' && tableNo) {
    lines.push(`Table Number: ${tableNo}`);
  } else if (orderType === 'Home Delivery' && deliveryAddress) {
    lines.push(`Delivery Address: ${deliveryAddress}`);
  }

  lines.push('');
  lines.push('Please confirm my order.');

  const rawMessage = lines.join('\n');
  const encodedMessage = encodeURIComponent(rawMessage);
  const cleanWa = (currentSettings.whatsapp_number || '9494608182').replace(/\D/g, '');

  return {
    rawMessage,
    encodedMessage,
    url: `https://wa.me/91${cleanWa}?text=${encodedMessage}`
  };
}

function launchWhatsAppOrder(orderType = 'Takeaway', customerName = '') {
  const result = generateWhatsAppOrderMessage(orderType, customerName);
  if (result) {
    window.open(result.url, '_blank', 'noopener,noreferrer');
  }
}

// =======================================================================
// 4. CART DRAWER UI RENDERING
// =======================================================================
function renderCartDrawer() {
  const drawerBody = document.getElementById('cartDrawerBody');
  const subtotalEl = document.getElementById('cartDrawerSubtotal');
  const totalEl = document.getElementById('cartDrawerTotal');

  if (!drawerBody) return;

  const { cart, subtotal, grandTotal } = getCartCalculations();

  if (cart.length === 0) {
    drawerBody.innerHTML = `
      <div class="cart-empty-state">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🍲</div>
        <p><strong>Your cart is empty</strong></p>
        <p style="font-size: 0.88rem; margin-top: 6px;">Browse our authentic delicacies and add your favourites!</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '₹0';
    if (totalEl) totalEl.textContent = '₹0';
    return;
  }

  let html = '';
  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    html += `
      <div class="cart-item">
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">₹${item.price} each = <strong>₹${itemTotal}</strong></div>
        </div>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateCartQuantity('${item.id}', -1)">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
        </div>
      </div>
    `;
  });

  drawerBody.innerHTML = html;
  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (totalEl) totalEl.textContent = `₹${grandTotal}`;
}

function openCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartDrawerOverlay');
  if (drawer) drawer.classList.add('active');
  if (overlay) overlay.classList.add('active');
  renderCartDrawer();
}

function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartDrawerOverlay');
  if (drawer) drawer.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
}

// =======================================================================
// 5. TOAST NOTIFICATIONS
// =======================================================================
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgColor = type === 'warning' ? '#d97706' : type === 'error' ? '#dc2626' : '#15803d';
  toast.style.cssText = `background:${bgColor};color:white;padding:12px 20px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.2);font-weight:600;font-size:0.92rem;display:flex;align-items:center;gap:10px;animation:fadeIn 0.25s ease;`;
  toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '✓'}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// =======================================================================
// 6. INITIALIZATION
// =======================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadRestaurantSettings();
  updateCartBadge();
  renderCartDrawer();

  // Mobile menu toggle & click-outside auto-close
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('active');
    });

    // Close when clicking any nav link
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !mobileToggle.contains(e.target)) {
        navLinks.classList.remove('active');
      }
    });
  }

  // Cart button triggers
  document.querySelectorAll('[data-action="open-cart"]').forEach(btn => {
    btn.addEventListener('click', openCartDrawer);
  });

  const closeCartBtn = document.getElementById('closeCartDrawer');
  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', closeCartDrawer);
  }

  const cartOverlay = document.getElementById('cartDrawerOverlay');
  if (cartOverlay) {
    cartOverlay.addEventListener('click', closeCartDrawer);
  }

  // WhatsApp order button in cart drawer
  const drawerWaBtn = document.getElementById('drawerWhatsAppOrderBtn');
  if (drawerWaBtn) {
    drawerWaBtn.addEventListener('click', () => {
      launchWhatsAppOrder('Takeaway');
    });
  }
});
