-- =======================================================================
-- SAANVI'S KITCHEN - Relational Database Schema (MySQL 8 / 9)
-- =======================================================================

CREATE DATABASE IF NOT EXISTS saanvis_kitchen_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE saanvis_kitchen_db;

-- 1. Restaurant Settings Table (Single Source of Truth for Config)
CREATE TABLE IF NOT EXISTS restaurant_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_name VARCHAR(150) NOT NULL DEFAULT 'SAANVI\'S KITCHEN',
    tagline VARCHAR(255) NOT NULL DEFAULT 'Authentic Taste, Made With Love',
    phone_number VARCHAR(20) NOT NULL DEFAULT '9494608182',
    whatsapp_number VARCHAR(20) NOT NULL DEFAULT '9494608182',
    contact_number VARCHAR(20) NOT NULL DEFAULT '9494608182',
    address TEXT NOT NULL,
    business_type VARCHAR(100) NOT NULL DEFAULT 'Dine-in and Online Orders',
    google_maps_url TEXT NOT NULL,
    is_dine_in_enabled TINYINT(1) DEFAULT 1,
    is_online_order_enabled TINYINT(1) DEFAULT 1,
    opening_hours VARCHAR(100) DEFAULT '11:00 AM - 11:00 PM',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(255),
    is_veg TINYINT(1) DEFAULT 1,
    is_available TINYINT(1) DEFAULT 1,
    is_popular TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Dine-in Table Reservations
CREATE TABLE IF NOT EXISTS reservations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reservation_code VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    guests INT NOT NULL,
    reservation_date DATE NOT NULL,
    time_slot VARCHAR(30) NOT NULL,
    special_requests TEXT,
    status ENUM('confirmed', 'seated', 'completed', 'cancelled') DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_res_date_slot (reservation_date, time_slot),
    INDEX idx_res_phone (phone)
) ENGINE=InnoDB;

-- 5. Customer Orders
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    order_type ENUM('Dine-in', 'Takeaway', 'Home Delivery') NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    delivery_address TEXT,
    table_number VARCHAR(20),
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_charges DECIMAL(10, 2) DEFAULT 0.00,
    delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Cash / Counter',
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    status ENUM('placed', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'placed',
    whatsapp_source TINYINT(1) DEFAULT 0,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_orders_status (status),
    INDEX idx_orders_phone (customer_phone)
) ENGINE=InnoDB;

-- 6. Order Line Items
CREATE TABLE IF NOT EXISTS order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    item_id INT,
    item_name VARCHAR(150) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
