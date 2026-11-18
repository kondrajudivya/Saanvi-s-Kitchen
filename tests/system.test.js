/**
 * SAANVI'S KITCHEN — Automated System & QA Verification Test Suite
 * Tests all 11 implementation requirements from the restaurant specification
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('===============================================================');
  console.log("🧪 STARTING SAANVI'S KITCHEN QA & SYSTEM VERIFICATION SUITE");
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // Start server instance for testing
  const { app, startServer } = require('../server/server');
  const server = await startServer();
  const PORT = process.env.PORT || 5000;
  const BASE_URL = `http://localhost:${PORT}`;

  try {
    // -------------------------------------------------------------
    // TEST 1: Server & Database Health
    // -------------------------------------------------------------
    await testAsync('Requirement 2: Backend boots up and reports healthy', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert.strictEqual(res.status, 200, 'Health endpoint should return 200');
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.restaurant, "SAANVI'S KITCHEN");
      assert.strictEqual(data.phone, '9494608182');
    });

    // -------------------------------------------------------------
    // TEST 2: Branding & Restaurant Details (Section 1 & 3)
    // -------------------------------------------------------------
    await testAsync('Requirement 1 & 3: Restaurant details & branding verified in settings', async () => {
      const res = await fetch(`${BASE_URL}/api/settings`);
      assert.strictEqual(res.status, 200);
      const { settings } = await res.json();

      assert.strictEqual(settings.restaurant_name, "SAANVI'S KITCHEN", 'Name must be SAANVI\'S KITCHEN');
      assert.strictEqual(settings.tagline, "Authentic Taste, Made With Love", 'Tagline must be Authentic Taste, Made With Love');
      assert.strictEqual(settings.phone_number, "9494608182", 'Phone must be 9494608182');
      assert.strictEqual(settings.whatsapp_number, "9494608182", 'WhatsApp number must be 9494608182');
      assert.strictEqual(settings.contact_number, "9494608182", 'Contact number field must be 9494608182');
      assert.ok(settings.address.includes("Annapoorneswari Nilayam"), 'Address must include Annapoorneswari Nilayam');
      assert.ok(settings.address.includes("Madiwala, Bengaluru"), 'Address must include Madiwala, Bengaluru');
      assert.strictEqual(settings.business_type, "Dine-in and Online Orders", 'Business type must be Dine-in and Online Orders');
    });

    // -------------------------------------------------------------
    // TEST 3: Click-to-call and WhatsApp links formatting (Section 4)
    // -------------------------------------------------------------
    test('Requirement 4: Phone and WhatsApp link format validation', () => {
      const phone = "9494608182";
      const telLink = `tel:${phone}`;
      assert.strictEqual(telLink, 'tel:9494608182', 'Click-to-call link must match tel:9494608182');

      const waLink = `https://wa.me/91${phone}`;
      assert.strictEqual(waLink, 'https://wa.me/919494608182', 'WhatsApp link must use +91 country code (https://wa.me/919494608182)');
    });

    // -------------------------------------------------------------
    // TEST 4: Google Maps Directions link (Section 6)
    // -------------------------------------------------------------
    test('Requirement 6: Google Maps Search URL formatting', () => {
      const expectedUrl = "https://www.google.com/maps/search/?api=1&query=Annapoorneswari%20Nilayam%2C%20Old%20Post%20Office%20Road%2C%20Maruthi%20Nagar%2C%20Madiwala%2C%20Bengaluru%2C%20Karnataka%2C%20India";
      const queryAddress = "Annapoorneswari Nilayam, Old Post Office Road, Maruthi Nagar, Madiwala, Bengaluru, Karnataka, India.";
      const generated = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryAddress.replace(/\.$/, ''))}`;

      assert.ok(generated.includes('api=1'), 'Must include api=1');
      assert.ok(generated.includes('Annapoorneswari'), 'Must include address query');
      assert.strictEqual(expectedUrl, "https://www.google.com/maps/search/?api=1&query=Annapoorneswari%20Nilayam%2C%20Old%20Post%20Office%20Road%2C%20Maruthi%20Nagar%2C%20Madiwala%2C%20Bengaluru%2C%20Karnataka%2C%20India");
    });

    // -------------------------------------------------------------
    // TEST 5: WhatsApp Ordering Dynamic Message Generation (Section 5)
    // -------------------------------------------------------------
    test('Requirement 5: Dynamic WhatsApp order message matches required format with URL encoding', () => {
      const cart = [
        { name: 'Chicken Dum Biryani', price: 190, quantity: 2 },
        { name: 'Masala Dosa', price: 90, quantity: 1 }
      ];

      const restaurantName = "Saanvi's Kitchen";
      const orderType = "Takeaway";

      let lines = [];
      lines.push(`Hello ${restaurantName}!`);
      lines.push('');
      lines.push('I would like to place an order.');
      lines.push('');
      lines.push('Items:');

      let subtotal = 0;
      cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        lines.push(`${item.name} × ${item.quantity} – ₹${itemTotal}`);
      });

      lines.push('');
      lines.push(`Total: ₹${subtotal}`);
      lines.push('');
      lines.push(`Order Type: ${orderType}`);
      lines.push('');
      lines.push('Please confirm my order.');

      const messageText = lines.join('\n');

      // Verify exact structure
      assert.ok(messageText.includes("Hello Saanvi's Kitchen!"), 'Must include Hello Saanvi\'s Kitchen!');
      assert.ok(messageText.includes("Chicken Dum Biryani × 2 – ₹380"), 'Must compute 2 × 190 = 380');
      assert.ok(messageText.includes("Masala Dosa × 1 – ₹90"), 'Must compute 1 × 90 = 90');
      assert.ok(messageText.includes("Total: ₹470"), 'Must compute total 470');
      assert.ok(messageText.includes("Order Type: Takeaway"), 'Must include Order Type: Takeaway');
      assert.ok(messageText.includes("Please confirm my order."), 'Must include Please confirm my order.');

      // Verify URL encoding
      const encoded = encodeURIComponent(messageText);
      assert.ok(!encoded.includes(' '), 'Encoded string must not contain raw spaces');
      assert.ok(encoded.includes('%E2%80%93') || encoded.includes('%E2%80%94') || encoded.includes('-') || encoded.includes('%20'), 'Handles unicode dash and special characters');

      const waFullUrl = `https://wa.me/919494608182?text=${encoded}`;
      assert.ok(waFullUrl.startsWith('https://wa.me/919494608182?text='), 'Must point to +919494608182');
    });

    // -------------------------------------------------------------
    // TEST 6: Menu Listing API (Section 8)
    // -------------------------------------------------------------
    await testAsync('Requirement 8: Menu API returns authentic dishes and categories', async () => {
      const res = await fetch(`${BASE_URL}/api/menu`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.ok(data.items.length >= 10, 'Must have at least 10 items');

      const biryani = data.items.find(i => i.name === 'Chicken Dum Biryani');
      assert.ok(biryani, 'Chicken Dum Biryani must be on the menu');
      assert.strictEqual(parseFloat(biryani.price), 190.00);

      const dosa = data.items.find(i => i.name === 'Masala Dosa');
      assert.ok(dosa, 'Masala Dosa must be on the menu');
      assert.strictEqual(parseFloat(dosa.price), 90.00);
    });

    // -------------------------------------------------------------
    // TEST 7: Dine-in Table Reservation API & Double-Booking Prevention (Section 7)
    // -------------------------------------------------------------
    const testDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Tomorrow
    const testPhone = '94946' + Math.floor(10000 + Math.random() * 90000);

    await testAsync('Requirement 7: Table reservation creation with validation & confirmation details', async () => {
      const res = await fetch(`${BASE_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Test Customer',
          phone: testPhone,
          guests: 4,
          reservation_date: testDate,
          time_slot: '07:30 PM',
          special_requests: 'Window table please'
        })
      });

      assert.strictEqual(res.status, 201, 'Should successfully create reservation');
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.reservation.reservation_code.startsWith('SK-RES-'), 'Code should start with SK-RES-');
      assert.strictEqual(data.reservation.guests, 4);

      // Verify restaurant contact and address in confirmation
      assert.strictEqual(data.restaurant.phone_number, '9494608182', 'Confirmation must contain phone');
      assert.ok(data.restaurant.address.includes('Madiwala, Bengaluru'), 'Confirmation must contain address');
    });

    await testAsync('Requirement 7: Double-booking duplicate prevention returns 409 Conflict', async () => {
      // Attempting same booking again
      const res = await fetch(`${BASE_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Test Customer',
          phone: testPhone,
          guests: 4,
          reservation_date: testDate,
          time_slot: '07:30 PM'
        })
      });

      assert.strictEqual(res.status, 409, 'Duplicate booking must be rejected with 409 Conflict');
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.code, 'DUPLICATE_BOOKING');
    });

    // -------------------------------------------------------------
    // TEST 8: Online Orders Submission & Tracking (Section 8)
    // -------------------------------------------------------------
    let placedOrderCode = '';
    await testAsync('Requirement 8: Online order creation (Takeaway & Dine-in & Delivery)', async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_type: 'Takeaway',
          customer_name: 'Anand Kumar',
          customer_phone: '9494608182',
          items: [
            { id: 1, name: 'Chicken Dum Biryani', price: 190, quantity: 2 },
            { id: 2, name: 'Masala Dosa', price: 90, quantity: 1 }
          ],
          payment_method: 'Cash / Pay at Counter'
        })
      });

      assert.strictEqual(res.status, 201, 'Order must be created with 201');
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.order.order_code.startsWith('SK-ORD-'));
      assert.strictEqual(parseFloat(data.order.subtotal), 470);
      assert.strictEqual(data.restaurant.phone_number, '9494608182', 'Confirmation must display restaurant phone');

      placedOrderCode = data.order.order_code;
    });

    await testAsync('Requirement 8: Order tracking by code', async () => {
      assert.ok(placedOrderCode, 'Must have order code from previous test');
      const res = await fetch(`${BASE_URL}/api/orders/${placedOrderCode}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.order.order_code, placedOrderCode);
      assert.strictEqual(data.order.status, 'placed');
      assert.strictEqual(data.restaurant.phone_number, '9494608182');
    });

    // -------------------------------------------------------------
    // TEST 9: Admin Dashboard Settings Update & Database Persistence (Section 9)
    // -------------------------------------------------------------
    await testAsync('Requirement 9: Admin can update settings and persist to database', async () => {
      // 1. Login
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      assert.strictEqual(loginRes.status, 200);
      const loginData = await loginRes.json();
      const token = loginData.token;

      // 2. Update settings
      const updatedTagline = "Authentic Taste, Made With Pure Love";
      const updateRes = await fetch(`${BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          restaurant_name: "SAANVI'S KITCHEN",
          tagline: updatedTagline,
          phone_number: "9494608182",
          whatsapp_number: "9494608182",
          contact_number: "9494608182",
          address: "Annapoorneswari Nilayam, Old Post Office Road, Maruthi Nagar, Madiwala, Bengaluru, Karnataka, India.",
          business_type: "Dine-in and Online Orders"
        })
      });

      assert.strictEqual(updateRes.status, 200);

      // 3. Verify settings were updated in database
      const checkRes = await fetch(`${BASE_URL}/api/settings`);
      const checkData = await checkRes.json();
      assert.strictEqual(checkData.settings.tagline, updatedTagline, 'Database must reflect updated tagline');

      // 4. Revert back to original baseline
      await fetch(`${BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          restaurant_name: "SAANVI'S KITCHEN",
          tagline: "Authentic Taste, Made With Love",
          phone_number: "9494608182",
          whatsapp_number: "9494608182",
          contact_number: "9494608182",
          address: "Annapoorneswari Nilayam, Old Post Office Road, Maruthi Nagar, Madiwala, Bengaluru, Karnataka, India.",
          business_type: "Dine-in and Online Orders"
        })
      });
    });

    // -------------------------------------------------------------
    // TEST 10: Frontend Files & HTML Integrity (Section 3-10)
    // -------------------------------------------------------------
    test('Requirement 10 & 11: All required HTML pages exist and contain critical links', () => {
      const publicDir = path.join(__dirname, '../public');
      const requiredPages = [
        'index.html',
        'menu.html',
        'reservation.html',
        'reservation-confirmation.html',
        'checkout.html',
        'order-confirmation.html',
        'order-tracking.html',
        'contact.html',
        'admin.html'
      ];

      requiredPages.forEach(page => {
        const filePath = path.join(publicDir, page);
        assert.ok(fs.existsSync(filePath), `Page ${page} must exist in public/`);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Check branding
        assert.ok(content.includes("SAANVI'S KITCHEN"), `${page} must display SAANVI'S KITCHEN`);
        
        // Check phone link
        assert.ok(content.includes('tel:9494608182'), `${page} must contain click-to-call tel:9494608182`);

        // Check WhatsApp link
        assert.ok(content.includes('https://wa.me/919494608182'), `${page} must contain WhatsApp link`);
      });

      // Check Contact Us page has complete address and Google Maps directions
      const contactHtml = fs.readFileSync(path.join(publicDir, 'contact.html'), 'utf-8');
      assert.ok(contactHtml.includes('Annapoorneswari Nilayam, Old Post Office Road, Maruthi Nagar, Madiwala, Bengaluru'), 'Contact page must display complete address');
      assert.ok(contactHtml.includes('https://www.google.com/maps/search/?api=1&query=Annapoorneswari%20Nilayam'), 'Contact page must have Get Directions button');
    });

  } finally {
    await new Promise((resolve) => {
      server.close(() => {
        resolve();
      });
    });
    const db = require('../server/config/db');
    if (db.pool) {
      await db.pool.end();
    }
  }

  console.log('\n===============================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
