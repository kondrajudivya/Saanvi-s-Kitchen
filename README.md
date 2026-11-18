# 🍲 Sanvi Kitchens — Restaurant Web Application

> **Authentic Taste, Made With Love**  
> Complete Full-Stack Dine-in, Table Reservations, Takeaway & WhatsApp Ordering Web Application.

---

## 📍 Restaurant Identity & Contact Details
- **Restaurant Name**: `SAANVI'S KITCHEN`
- **Tagline**: `Authentic Taste, Made With Love`
- **Phone Number**: `9494608182` (Click-to-call: `tel:9494608182`)
- **WhatsApp Number**: `9494608182` (WhatsApp link: `https://wa.me/919494608182` with +91 country code)
- **Contact Number Field**: `9494608182`
- **Complete Address**: `Annapoorneswari Nilayam, Old Post Office Road, Maruthi Nagar, Madiwala, Bengaluru, Karnataka, India.`
- **Business Type**: `Dine-in and Online Orders`
- **Google Maps Directions**: `https://www.google.com/maps/search/?api=1&query=Annapoorneswari%20Nilayam%2C%20Old%20Post%20Office%20Road%2C%20Maruthi%20Nagar%2C%20Madiwala%2C%20Bengaluru%2C%20Karnataka%2C%20India`

> [!NOTE]
> The contact number `9494608182` is displayed as a regular restaurant contact number and is not advertised as a toll-free service.

---

## 🌟 Key Features Implemented

### 1. Dynamic Branding & Multi-Surface Phone/WhatsApp Integration
- Prominent branding across homepage hero, navigation bar, browser page titles, and footer.
- Working click-to-call links (`tel:9494608182`) across:
  - Homepage header
  - Homepage footer
  - Contact Us page
  - Order confirmation page
  - Table reservation confirmation page
- Working WhatsApp links (`https://wa.me/919494608182`) using the India `+91` country code.

### 2. Functional WhatsApp Ordering (Dynamic URL-Encoded)
- Customers select any dishes and quantities from the live menu.
- Generates a pre-filled, URL-encoded WhatsApp message dynamically formatted:
  ```
  Hello Saanvi's Kitchen!

  I would like to place an order.

  Items:
  Chicken Dum Biryani × 2 – ₹380
  Masala Dosa × 1 – ₹90

  Total: ₹470

  Order Type: Takeaway

  Please confirm my order.
  ```

### 3. Google Maps Directions
- "Get Directions" button on Homepage and Contact Us page.
- Direct URL: `https://www.google.com/maps/search/?api=1&query=Annapoorneswari%20Nilayam%2C%20Old%20Post%20Office%20Road%2C%20Maruthi%20Nagar%2C%20Madiwala%2C%20Bengaluru%2C%20Karnataka%2C%20India`
- Opens in a new browser tab (`target="_blank" rel="noopener noreferrer"`).
- Uses verified address query without fabricated GPS coordinates.

### 4. Dine-in Table Reservations
- Form supports:
  - Customer Name & 10-digit mobile number validation
  - Number of guests (1 to 20+)
  - Date selector (disallows past dates)
  - Lunch (12:00 PM – 3:30 PM) and Dinner (7:00 PM – 10:30 PM) time slot selector
  - Special requests textarea
- Double-booking prevention algorithm checks both customer duplicate phone and slot capacity.
- Confirmation view displays reservation code, customer details, restaurant phone (`9494608182`), and complete address.

### 5. Online Orders & Takeaway
- Supports Dine-in, Takeaway, and Home Delivery.
- Browse authentic dishes with vegetarian and non-vegetarian indicators.
- Persistent cart with quantity adjustment and dynamic calculations.
- Order submission with real-time status tracking (`order-tracking.html`).

### 6. Admin Dashboard Settings
- Editable settings:
  - Restaurant Name
  - Tagline
  - Phone Number
  - WhatsApp Number
  - Contact Number Field
  - Complete Address
  - Business Type
- Admin updates settings via `/admin.html` without manually modifying source code.
- Stored directly in the MySQL database `restaurant_settings` table.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Node.js & Express REST API (`server/server.js`)
- **Database**: MySQL 8 / 9 (`saanvis_kitchen_db`) with fallback store
- **Frontend**: Responsive HTML5, CSS3 Custom Properties, Vanilla ES6 JavaScript
- **Security**: Parameterized queries, input validation, JWT admin authentication

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
```ini
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=saanvis_kitchen_db
```

### 3. Initialize & Seed Database
```bash
npm run seed
```

### 4. Start Server
```bash
npm start
# Server boots up on http://localhost:5000
```

### 5. Run Automated QA Tests
```bash
npm test
```
