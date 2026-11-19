const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));
app.use(express.static(path.join(__dirname, '..')));

// Mount API routes
app.use('/api', apiRoutes);

// Specific clean route rewrites
app.get('/menu', (req, res) => res.sendFile(path.join(publicDir, 'menu.html')));
app.get('/reservations', (req, res) => res.sendFile(path.join(publicDir, 'reservation.html')));
app.get('/reservation', (req, res) => res.sendFile(path.join(publicDir, 'reservation.html')));
app.get('/order', (req, res) => res.sendFile(path.join(publicDir, 'checkout.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(publicDir, 'checkout.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(publicDir, 'contact.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));
app.get('/track', (req, res) => res.sendFile(path.join(publicDir, 'order-tracking.html')));

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// Bootstrapping sequence
async function startServer() {
  console.log('----------------------------------------------------');
  console.log("🌟 Starting SANVI KITCHENS Server Application...");
  console.log('----------------------------------------------------');

  await db.initDatabase();

  const server = app.listen(PORT, () => {
    console.log(`🚀 Sanvi Kitchens server is running on http://localhost:${PORT}`);
    console.log(`📞 Restaurant Contact: 9494608182 (Click-to-call: tel:9494608182)`);
    console.log(`💬 WhatsApp Ordering: https://wa.me/919494608182`);
    console.log(`📍 Address: Annapoorneswari Nilayam, Old Post Office Road, Maruthi Nagar, Madiwala, Bengaluru`);
    console.log('----------------------------------------------------');
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
