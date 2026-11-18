const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'saanvis_kitchen_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  charset: 'utf8mb4'
};

let pool = null;
let isDbConnected = false;

// Fallback in-memory / JSON store for zero-downtime resilience
const fallbackFile = path.join(__dirname, 'fallback_store.json');

const defaultData = {
  settings: {
    id: 1,
    restaurant_name: "SAANVI'S KITCHEN",
    tagline: "Authentic Taste, Made With Love",
    phone_number: "9494608182",
    whatsapp_number: "9494608182",
    contact_number: "9494608182",
    address: "Annapoorneswari Nilayam, Old Post Office Road, Maruthi Nagar, Madiwala, Bengaluru, Karnataka, India.",
    business_type: "Dine-in and Online Orders",
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Annapoorneswari%20Nilayam%2C%20Old%20Post%20Office%20Road%2C%20Maruthi%20Nagar%2C%20Madiwala%2C%20Bengaluru%2C%20Karnataka%2C%20India",
    is_dine_in_enabled: 1,
    is_online_order_enabled: 1,
    opening_hours: "11:00 AM – 11:00 PM"
  },
  categories: [
    { id: 1, name: "Biryanis & Rice", slug: "biryani", display_order: 1 },
    { id: 2, name: "South Indian Tiffins", slug: "south-indian", display_order: 2 },
    { id: 3, name: "Starters & Appetizers", slug: "starters", display_order: 3 },
    { id: 4, name: "Curries & Gravies", slug: "curries", display_order: 4 },
    { id: 5, name: "Breads & Roti", slug: "breads", display_order: 5 },
    { id: 6, name: "Desserts & Beverages", slug: "desserts-beverages", display_order: 6 }
  ],
  menu_items: [
    {
      id: 1,
      category_id: 1,
      name: "Chicken Dum Biryani",
      description: "Signature fragrant basmati rice layered with tender marinated chicken, saffron, and slow-cooked in traditional dum pot.",
      price: 190.00,
      image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80",
      is_veg: 0,
      is_available: 1,
      is_popular: 1
    },
    {
      id: 2,
      category_id: 2,
      name: "Masala Dosa",
      description: "Crispy golden fermented crepe stuffed with spiced potato mash, served with coconut chutney, tomato chutney, and piping hot sambar.",
      price: 90.00,
      image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80",
      is_veg: 1,
      is_available: 1,
      is_popular: 1
    },
    {
      id: 3,
      category_id: 1,
      name: "Mutton Dum Biryani",
      description: "Succulent pieces of tender baby mutton slow-braised with whole ground spices and aged basmati rice.",
      price: 280.00,
      image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80",
      is_veg: 0,
      is_available: 1,
      is_popular: 1
    },
    {
      id: 4,
      category_id: 1,
      name: "Paneer Dum Biryani",
      description: "Fresh cottage cheese cubes marinated in mint-yogurt masala, layered with spiced saffron rice and fried onions.",
      price: 170.00,
      image_url: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=500&auto=format&fit=crop&q=80",
      is_veg: 1,
      is_available: 1,
      is_popular: 0
    },
    {
      id: 5,
      category_id: 2,
      name: "Ghee Roast Dosa",
      description: "Crisp dosa roasted in pure desi ghee, served with our signature trio of chutneys and drumstick sambar.",
      price: 110.00,
      image_url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80",
      is_veg: 1,
      is_available: 1,
      is_popular: 1
    },
    {
      id: 6,
      category_id: 2,
      name: "Idli Vada Combo",
      description: "Two steamed pillowy rice cakes paired with one crispy medu vada, served with ghee, sambar, and coconut chutney.",
      price: 75.00,
      image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80",
      is_veg: 1,
      is_available: 1,
      is_popular: 0
    },
    {
      id: 7,
      category_id: 3,
      name: "Chicken 65",
      description: "South Indian spicy, deep-fried chicken appetizer infused with curry leaves, crushed garlic, and fiery red chilies.",
      price: 180.00,
      image_url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&auto=format&fit=crop&q=80",
      is_veg: 0,
      is_available: 1,
      is_popular: 1
    },
    {
      id: 8,
      category_id: 3,
      name: "Gobi Manchurian",
      description: "Crispy cauliflower florets tossed in tangy soya-garlic glaze with spring onions and green chilies.",
      price: 140.00,
      image_url: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop&q=80",
      is_veg: 1,
      is_available: 1,
      is_popular: 0
    },
    {
      id: 9,
      category_id: 4,
      name: "Butter Chicken",
      description: "Charcoal-grilled chicken simmered in a silky, mildly sweet and rich butter-tomato cream sauce.",
      price: 220.00,
      image_url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80",
      is_veg: 0,
      is_available: 1,
      is_popular: 1
    },
    {
      id: 10,
      category_id: 4,
      name: "Paneer Butter Masala",
      description: "Fresh cottage cheese cubes folded into a luxurious cashew and tomato gravy infused with kasuri methi.",
      price: 180.00,
      image_url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80",
      is_veg: 1,
      is_available: 1,
      is_popular: 1
    },
    {
      id: 11,
      category_id: 5,
      name: "Butter Naan",
      description: "Soft leavened tandoor-baked flatbread brushed generously with fresh butter.",
      price: 45.00,
      image_url: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=80",
      is_veg: 1,
      is_available: 1,
      is_popular: 0
    },
    {
      id: 12,
      category_id: 5,
      name: "Tandoori Roti",
      description: "Whole wheat crisp flatbread baked in the clay oven.",
      price: 30.00,
      image_url: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=80",
      is_veg: 1,
      is_available: 1,
      is_popular: 0
    },
    {
      id: 13,
      category_id: 6,
      name: "South Indian Filter Coffee",
      description: "Authentic chicory-blend decoction frothed with boiled whole milk, served in traditional dabarah and tumbler.",
      price: 40.00,
      image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80",
      is_veg: 1,
      is_available: 1,
      is_popular: 1
    },
    {
      id: 14,
      category_id: 6,
      name: "Gulab Jamun (2 Pcs)",
      description: "Warm golden milk-solid dumplings soaked in rose and green cardamom flavored sugar syrup.",
      price: 60.00,
      image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80",
      is_veg: 1,
      is_available: 1,
      is_popular: 1
    }
  ],
  reservations: [],
  orders: []
};

// Initialize fallback JSON store if not exists
if (!fs.existsSync(fallbackFile)) {
  fs.writeFileSync(fallbackFile, JSON.stringify(defaultData, null, 2), 'utf-8');
}

function getFallbackStore() {
  try {
    const raw = fs.readFileSync(fallbackFile, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return defaultData;
  }
}

function saveFallbackStore(data) {
  try {
    fs.writeFileSync(fallbackFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving fallback store:', err.message);
  }
}

async function initDatabase() {
  try {
    // First, connect to MySQL server without database to ensure database exists
    const adminConn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await adminConn.end();

    // Now establish connection pool with the database
    pool = mysql.createPool(dbConfig);
    const testConn = await pool.getConnection();
    isDbConnected = true;
    console.log(`[DB] Connected successfully to MySQL database: ${dbConfig.database}`);
    testConn.release();

    // Run schema creation
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const rawSchema = fs.readFileSync(schemaPath, 'utf-8');
      const cleanSchema = rawSchema.replace(/--.*$/gm, '');
      const statements = cleanSchema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.toLowerCase().startsWith('use') && !s.toLowerCase().startsWith('create database'));

      for (const statement of statements) {
        try {
          await pool.query(statement);
        } catch (stmtErr) {
          // table already exists or minor warning
        }
      }
      console.log('[DB] Schema verified/migrated successfully.');
    }

    // Seed default settings if empty
    const [settingsRows] = await pool.query('SELECT COUNT(*) as count FROM restaurant_settings');
    if (settingsRows[0].count === 0) {
      await pool.query(
        `INSERT INTO restaurant_settings 
          (restaurant_name, tagline, phone_number, whatsapp_number, contact_number, address, business_type, google_maps_url, is_dine_in_enabled, is_online_order_enabled, opening_hours)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          defaultData.settings.restaurant_name,
          defaultData.settings.tagline,
          defaultData.settings.phone_number,
          defaultData.settings.whatsapp_number,
          defaultData.settings.contact_number,
          defaultData.settings.address,
          defaultData.settings.business_type,
          defaultData.settings.google_maps_url,
          defaultData.settings.is_dine_in_enabled,
          defaultData.settings.is_online_order_enabled,
          defaultData.settings.opening_hours
        ]
      );
      console.log('[DB] Seeded initial restaurant settings.');
    }

    // Seed categories if empty
    const [catRows] = await pool.query('SELECT COUNT(*) as count FROM menu_categories');
    if (catRows[0].count === 0) {
      for (const cat of defaultData.categories) {
        await pool.query(
          'INSERT INTO menu_categories (id, name, slug, display_order) VALUES (?, ?, ?, ?)',
          [cat.id, cat.name, cat.slug, cat.display_order]
        );
      }
      console.log('[DB] Seeded menu categories.');
    }

    // Seed menu items if empty
    const [itemRows] = await pool.query('SELECT COUNT(*) as count FROM menu_items');
    if (itemRows[0].count === 0) {
      for (const item of defaultData.menu_items) {
        await pool.query(
          `INSERT INTO menu_items (id, category_id, name, description, price, image_url, is_veg, is_available, is_popular)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.category_id, item.name, item.description, item.price, item.image_url, item.is_veg, item.is_available, item.is_popular]
        );
      }
      console.log('[DB] Seeded initial menu items.');
    }

    return true;
  } catch (err) {
    console.warn(`[DB WARNING] MySQL connection failed (${err.message}). Using local high-performance fallback store.`);
    isDbConnected = false;
    return false;
  }
}

// Unified query executor with graceful fallback
async function query(sql, params = []) {
  if (isDbConnected && pool) {
    try {
      const [results] = await pool.query(sql, params);
      return results;
    } catch (err) {
      console.error('[DB Query Error]:', err.message);
      throw err;
    }
  }
  // If MySQL is not connected, use fallback
  return executeFallbackQuery(sql, params);
}

function executeFallbackQuery(sql, params) {
  const store = getFallbackStore();
  const normalizedSql = sql.trim().toLowerCase();

  // SELECT FROM restaurant_settings
  if (normalizedSql.startsWith('select') && normalizedSql.includes('restaurant_settings')) {
    return [store.settings];
  }

  // UPDATE restaurant_settings
  if (normalizedSql.startsWith('update') && normalizedSql.includes('restaurant_settings')) {
    // params expected: [name, tagline, phone, whatsapp, contact, address, business_type, id]
    store.settings.restaurant_name = params[0] || store.settings.restaurant_name;
    store.settings.tagline = params[1] || store.settings.tagline;
    store.settings.phone_number = params[2] || store.settings.phone_number;
    store.settings.whatsapp_number = params[3] || store.settings.whatsapp_number;
    store.settings.contact_number = params[4] || store.settings.contact_number;
    store.settings.address = params[5] || store.settings.address;
    store.settings.business_type = params[6] || store.settings.business_type;
    saveFallbackStore(store);
    return { affectedRows: 1 };
  }

  // SELECT FROM menu_items
  if (normalizedSql.startsWith('select') && normalizedSql.includes('menu_items')) {
    return store.menu_items;
  }

  // SELECT FROM menu_categories
  if (normalizedSql.startsWith('select') && normalizedSql.includes('menu_categories')) {
    return store.categories;
  }

  // INSERT INTO reservations
  if (normalizedSql.startsWith('insert') && normalizedSql.includes('reservations')) {
    const newRes = {
      id: store.reservations.length + 1,
      reservation_code: params[0],
      customer_name: params[1],
      phone: params[2],
      guests: params[3],
      reservation_date: params[4],
      time_slot: params[5],
      special_requests: params[6],
      status: 'confirmed',
      created_at: new Date().toISOString()
    };
    store.reservations.push(newRes);
    saveFallbackStore(store);
    return { insertId: newRes.id };
  }

  // SELECT FROM reservations
  if (normalizedSql.startsWith('select') && normalizedSql.includes('reservations')) {
    return store.reservations;
  }

  // INSERT INTO orders
  if (normalizedSql.startsWith('insert') && normalizedSql.includes('orders')) {
    const newOrder = {
      id: store.orders.length + 1,
      order_code: params[0],
      order_type: params[1],
      customer_name: params[2],
      customer_phone: params[3],
      delivery_address: params[4],
      table_number: params[5],
      subtotal: params[6],
      tax_charges: params[7],
      delivery_fee: params[8],
      total_amount: params[9],
      payment_method: params[10],
      status: 'placed',
      whatsapp_source: params[11] || 0,
      special_instructions: params[12] || '',
      created_at: new Date().toISOString(),
      items: []
    };
    store.orders.push(newOrder);
    saveFallbackStore(store);
    return { insertId: newOrder.id };
  }

  return [];
}

module.exports = {
  pool,
  initDatabase,
  query,
  getFallbackStore,
  saveFallbackStore,
  isDbConnected: () => isDbConnected
};
