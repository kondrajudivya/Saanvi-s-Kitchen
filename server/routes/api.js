const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'saanvis_kitchen_super_secret_jwt_key_9494608182_2026';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

// Helper to generate unique tracking codes
function generateCode(prefix) {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${randomNum}`;
}

// =======================================================================
// 1. HEALTH CHECK
// =======================================================================
router.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    restaurant: "SAANVI'S KITCHEN",
    tagline: 'Authentic Taste, Made With Love',
    phone: '9494608182',
    db_connected: db.isDbConnected(),
    timestamp: new Date().toISOString()
  });
});

// =======================================================================
// 2. RESTAURANT SETTINGS (Dynamic single-source-of-truth)
// =======================================================================
router.get('/settings', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM restaurant_settings LIMIT 1');
    if (rows && rows.length > 0) {
      return res.json({ success: true, settings: rows[0] });
    }
    // Fallback if table was empty
    const fallback = db.getFallbackStore().settings;
    return res.json({ success: true, settings: fallback });
  } catch (err) {
    console.error('Error fetching settings:', err.message);
    const fallback = db.getFallbackStore().settings;
    return res.json({ success: true, settings: fallback });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const {
      restaurant_name,
      tagline,
      phone_number,
      whatsapp_number,
      contact_number,
      address,
      business_type
    } = req.body;

    if (!restaurant_name || !phone_number || !address) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant name, phone number, and address are mandatory fields.'
      });
    }

    // Clean Indian 10-digit phone
    const cleanPhone = phone_number.replace(/\D/g, '');
    const cleanWa = (whatsapp_number || phone_number).replace(/\D/g, '');
    const cleanContact = (contact_number || phone_number).replace(/\D/g, '');

    await db.query(
      `UPDATE restaurant_settings 
       SET restaurant_name = ?, tagline = ?, phone_number = ?, whatsapp_number = ?, contact_number = ?, address = ?, business_type = ?
       WHERE id = 1`,
      [
        restaurant_name.trim(),
        tagline ? tagline.trim() : 'Authentic Taste, Made With Love',
        cleanPhone,
        cleanWa,
        cleanContact,
        address.trim(),
        business_type ? business_type.trim() : 'Dine-in and Online Orders'
      ]
    );

    // Also update memory fallback store
    const store = db.getFallbackStore();
    store.settings.restaurant_name = restaurant_name.trim();
    store.settings.tagline = tagline ? tagline.trim() : store.settings.tagline;
    store.settings.phone_number = cleanPhone;
    store.settings.whatsapp_number = cleanWa;
    store.settings.contact_number = cleanContact;
    store.settings.address = address.trim();
    store.settings.business_type = business_type ? business_type.trim() : store.settings.business_type;
    db.saveFallbackStore(store);

    // Fetch refreshed
    const updated = await db.query('SELECT * FROM restaurant_settings WHERE id = 1');
    const result = updated && updated.length > 0 ? updated[0] : store.settings;

    return res.json({
      success: true,
      message: 'Restaurant settings updated successfully.',
      settings: result
    });
  } catch (err) {
    console.error('Error updating settings:', err.message);
    return res.status(500).json({ success: false, message: 'Server error updating settings.' });
  }
});

// =======================================================================
// 3. MENU APIS
// =======================================================================
router.get('/menu', async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM menu_categories ORDER BY display_order ASC');
    const items = await db.query('SELECT * FROM menu_items WHERE is_available = 1 ORDER BY category_id, id ASC');

    return res.json({
      success: true,
      categories,
      items
    });
  } catch (err) {
    console.error('Error fetching menu:', err.message);
    const store = db.getFallbackStore();
    return res.json({
      success: true,
      categories: store.categories,
      items: store.menu_items
    });
  }
});

// =======================================================================
// 4. TABLE RESERVATIONS (with Double-Booking Prevention & Validation)
// =======================================================================
router.post('/reservations', async (req, res) => {
  try {
    const {
      customer_name,
      phone,
      guests,
      reservation_date,
      time_slot,
      special_requests
    } = req.body;

    // 1. Validation
    if (!customer_name || !phone || !guests || !reservation_date || !time_slot) {
      return res.status(400).json({
        success: false,
        message: 'Please provide customer name, mobile number, guests, reservation date, and time slot.'
      });
    }

    // Validate phone number format (standard 10-digit Indian mobile)
    const cleanedPhone = phone.toString().replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit contact mobile number.'
      });
    }

    // Validate date (must not be in the past)
    const today = new Date().toISOString().split('T')[0];
    if (reservation_date < today) {
      return res.status(400).json({
        success: false,
        message: 'Reservation date cannot be in the past.'
      });
    }

    const guestCount = parseInt(guests, 10);
    if (isNaN(guestCount) || guestCount < 1 || guestCount > 30) {
      return res.status(400).json({
        success: false,
        message: 'Guest count must be between 1 and 30 persons.'
      });
    }

    // 2. Double-Booking Prevention:
    // (a) First, check if same customer already booked same slot (double-click/duplicate prevention)
    const duplicateCheck = await db.query(
      `SELECT id, reservation_code FROM reservations 
       WHERE reservation_date = ? AND time_slot = ? AND phone = ? AND status IN ('confirmed', 'seated') LIMIT 1`,
      [reservation_date, time_slot, cleanedPhone]
    );

    if (duplicateCheck && duplicateCheck.length > 0) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_BOOKING',
        message: `A confirmed reservation already exists for this mobile number (${cleanedPhone}) on ${reservation_date} at ${time_slot}.`,
        reservation_code: duplicateCheck[0].reservation_code
      });
    }

    // (b) Capacity rules: Max 8 active reservations OR 35 total guests per time slot on any given date
    const existing = await db.query(
      `SELECT COUNT(*) as reservation_count, COALESCE(SUM(guests), 0) as total_guests 
       FROM reservations 
       WHERE reservation_date = ? AND time_slot = ? AND status IN ('confirmed', 'seated')`,
      [reservation_date, time_slot]
    );

    const activeCount = existing && existing.length > 0 ? (parseInt(existing[0].reservation_count, 10) || 0) : 0;
    const currentGuests = existing && existing.length > 0 ? (parseInt(existing[0].total_guests, 10) || 0) : 0;

    const MAX_RESERVATIONS_PER_SLOT = 8;
    const MAX_GUESTS_PER_SLOT = 35;

    if (activeCount >= MAX_RESERVATIONS_PER_SLOT || (currentGuests + guestCount) > MAX_GUESTS_PER_SLOT) {
      return res.status(409).json({
        success: false,
        code: 'SLOT_FULL',
        message: `We apologize, but the ${time_slot} time slot on ${reservation_date} is fully booked. Please select an adjacent time slot or alternate date.`,
        suggested_slots: ['12:30 PM', '01:30 PM', '07:30 PM', '08:30 PM'].filter(s => s !== time_slot)
      });
    }

    // 3. Generate Reservation Code & Save
    const reservationCode = generateCode('SK-RES');

    const insertResult = await db.query(
      `INSERT INTO reservations 
        (reservation_code, customer_name, phone, guests, reservation_date, time_slot, special_requests, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [
        reservationCode,
        customer_name.trim(),
        cleanedPhone,
        guestCount,
        reservation_date,
        time_slot,
        special_requests ? special_requests.trim() : ''
      ]
    );

    // Fetch restaurant contact details for confirmation view
    const settingsRows = await db.query('SELECT * FROM restaurant_settings LIMIT 1');
    const settings = settingsRows && settingsRows.length > 0 ? settingsRows[0] : db.getFallbackStore().settings;

    return res.status(201).json({
      success: true,
      message: 'Table reservation confirmed successfully!',
      reservation: {
        id: insertResult.insertId,
        reservation_code: reservationCode,
        customer_name: customer_name.trim(),
        phone: cleanedPhone,
        guests: guestCount,
        reservation_date,
        time_slot,
        special_requests: special_requests || '',
        status: 'confirmed',
        created_at: new Date().toISOString()
      },
      restaurant: {
        name: settings.restaurant_name,
        tagline: settings.tagline,
        phone_number: settings.phone_number,
        contact_number: settings.contact_number,
        whatsapp_number: settings.whatsapp_number,
        address: settings.address,
        google_maps_url: settings.google_maps_url
      }
    });
  } catch (err) {
    console.error('Error submitting reservation:', err.message);
    return res.status(500).json({ success: false, message: 'Server error processing table reservation.' });
  }
});

router.get('/reservations', async (req, res) => {
  try {
    const { phone, date, status } = req.query;
    let sql = 'SELECT * FROM reservations WHERE 1=1';
    const params = [];

    if (phone) {
      sql += ' AND phone = ?';
      params.push(phone.toString().replace(/\D/g, ''));
    }
    if (date) {
      sql += ' AND reservation_date = ?';
      params.push(date);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY reservation_date DESC, id DESC LIMIT 100';

    const results = await db.query(sql, params);
    return res.json({ success: true, count: results.length, reservations: results });
  } catch (err) {
    console.error('Error fetching reservations:', err.message);
    const store = db.getFallbackStore();
    return res.json({ success: true, count: store.reservations.length, reservations: store.reservations });
  }
});

// =======================================================================
// 5. ONLINE ORDERS & TAKEAWAY
// =======================================================================
router.post('/orders', async (req, res) => {
  try {
    const {
      order_type,
      customer_name,
      customer_phone,
      delivery_address,
      table_number,
      items,
      payment_method,
      special_instructions,
      whatsapp_source
    } = req.body;

    // 1. Validation
    if (!order_type || !['Dine-in', 'Takeaway', 'Home Delivery'].includes(order_type)) {
      return res.status(400).json({
        success: false,
        message: 'Order type must be Dine-in, Takeaway, or Home Delivery.'
      });
    }

    if (!customer_name || !customer_phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and contact phone number are required.'
      });
    }

    const cleanPhone = customer_phone.toString().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit contact mobile number.'
      });
    }

    if (order_type === 'Home Delivery' && (!delivery_address || delivery_address.trim().length < 5)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a complete delivery address for Home Delivery orders.'
      });
    }

    if (order_type === 'Dine-in' && !table_number) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your Dine-in table number.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty. Please select food items before placing an order.'
      });
    }

    // 2. Calculate totals dynamically
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      const price = parseFloat(item.price);
      if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity or price for item: ${item.name || 'Unknown item'}`
        });
      }
      const itemTotal = price * qty;
      subtotal += itemTotal;
      validatedItems.push({
        id: item.id || null,
        name: item.name,
        price,
        quantity: qty,
        total: itemTotal
      });
    }

    // Charges calculation
    const taxCharges = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
    const deliveryFee = order_type === 'Home Delivery' ? 30.00 : 0.00;
    const totalAmount = Math.round((subtotal + taxCharges + deliveryFee) * 100) / 100;

    const orderCode = generateCode('SK-ORD');

    // 3. Insert order
    const insertOrderResult = await db.query(
      `INSERT INTO orders 
        (order_code, order_type, customer_name, customer_phone, delivery_address, table_number, subtotal, tax_charges, delivery_fee, total_amount, payment_method, status, whatsapp_source, special_instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'placed', ?, ?)`,
      [
        orderCode,
        order_type,
        customer_name.trim(),
        cleanPhone,
        delivery_address ? delivery_address.trim() : null,
        table_number ? table_number.trim() : null,
        subtotal,
        taxCharges,
        deliveryFee,
        totalAmount,
        payment_method || 'Cash / Pay at Counter',
        whatsapp_source ? 1 : 0,
        special_instructions ? special_instructions.trim() : ''
      ]
    );

    const orderId = insertOrderResult.insertId;

    // Insert order items
    for (const vItem of validatedItems) {
      try {
        await db.query(
          `INSERT INTO order_items (order_id, item_id, item_name, unit_price, quantity, total_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, vItem.id, vItem.name, vItem.price, vItem.quantity, vItem.total]
        );
      } catch (itemErr) {
        // Continue even if DB item insert is running in fallback mode
      }
    }

    // Fetch restaurant contact details for confirmation view
    const settingsRows = await db.query('SELECT * FROM restaurant_settings LIMIT 1');
    const settings = settingsRows && settingsRows.length > 0 ? settingsRows[0] : db.getFallbackStore().settings;

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: {
        id: orderId,
        order_code: orderCode,
        order_type,
        customer_name: customer_name.trim(),
        customer_phone: cleanPhone,
        delivery_address: delivery_address || null,
        table_number: table_number || null,
        subtotal,
        tax_charges: taxCharges,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        payment_method: payment_method || 'Cash / Pay at Counter',
        status: 'placed',
        items: validatedItems,
        created_at: new Date().toISOString()
      },
      restaurant: {
        name: settings.restaurant_name,
        tagline: settings.tagline,
        phone_number: settings.phone_number,
        contact_number: settings.contact_number,
        whatsapp_number: settings.whatsapp_number,
        address: settings.address
      }
    });
  } catch (err) {
    console.error('Error placing order:', err.message);
    return res.status(500).json({ success: false, message: 'Server error placing online order.' });
  }
});

router.get('/orders/:idOrCode', async (req, res) => {
  try {
    const param = req.params.idOrCode;
    let sql = 'SELECT * FROM orders WHERE order_code = ?';
    let params = [param];

    if (!isNaN(parseInt(param, 10)) && !param.includes('-')) {
      sql = 'SELECT * FROM orders WHERE id = ?';
      params = [parseInt(param, 10)];
    }

    const rows = await db.query(sql, params);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = rows[0];
    const items = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    order.items = items || [];

    // Settings for contact
    const settingsRows = await db.query('SELECT * FROM restaurant_settings LIMIT 1');
    const settings = settingsRows && settingsRows.length > 0 ? settingsRows[0] : db.getFallbackStore().settings;

    return res.json({
      success: true,
      order,
      restaurant: {
        name: settings.restaurant_name,
        phone_number: settings.phone_number,
        contact_number: settings.contact_number,
        whatsapp_number: settings.whatsapp_number,
        address: settings.address
      }
    });
  } catch (err) {
    console.error('Error tracking order:', err.message);
    return res.status(500).json({ success: false, message: 'Server error looking up order.' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { status, type, phone } = req.query;
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (type) {
      sql += ' AND order_type = ?';
      params.push(type);
    }
    if (phone) {
      sql += ' AND customer_phone = ?';
      params.push(phone.toString().replace(/\D/g, ''));
    }

    sql += ' ORDER BY id DESC LIMIT 100';

    const orders = await db.query(sql, params);
    return res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error('Error listing orders:', err.message);
    const store = db.getFallbackStore();
    return res.json({ success: true, count: store.orders.length, orders: store.orders });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['placed', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
      });
    }

    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    return res.json({ success: true, message: `Order status updated to '${status}' successfully.` });
  } catch (err) {
    console.error('Error updating order status:', err.message);
    return res.status(500).json({ success: false, message: 'Server error updating order status.' });
  }
});

// =======================================================================
// 6. ADMIN AUTHENTICATION
// =======================================================================
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign(
      { username: ADMIN_USER, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({
      success: true,
      message: 'Admin authenticated successfully.',
      token,
      user: { username: ADMIN_USER, role: 'admin' }
    });
  }

  return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
});

module.exports = router;
