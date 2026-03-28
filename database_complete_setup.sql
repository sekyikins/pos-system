-- =============================================================================
-- UNIFIED DATABASE SETUP SCRIPT FOR TECHFLOW POS & E-COMMERCE
-- =============================================================================
-- This script creates the entire database from scratch.
-- WARNING: Running this will drop and recreate the public schema!
-- =============================================================================

-- 0. INITIAL SETUP
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

SET search_path = public;

-- Enable UUID and Crypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. CORE & SHARED TABLES
-- ==========================================

-- 1.1 Categories
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 1.2 Products
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- Keep for compatibility, though categories table exists
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    barcode TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 1.3 Product Images
CREATE TABLE public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 1.4 Inventory Logs
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    change INTEGER NOT NULL, -- Positive for restock, negative for sale/loss
    reason TEXT NOT NULL CHECK (reason IN ('RESTOCK', 'SALE', 'ADJUSTMENT')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 2. STAFF & PERMISSIONS (POS)
-- ==========================================

-- 2.1 POS Staff (Formerly 'users')
CREATE TABLE public.pos_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'CASHIER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 3. CUSTOMERS (Unified approach)
-- ==========================================

-- 3.1 POS Customers (Internal / In-store)
CREATE TABLE public.customer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
    last_purchase_date DATE,
    order_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.2 E-Commerce Customers (Online Shoppers)
CREATE TABLE public.e_customer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
    last_purchase_date DATE,
    order_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 4. SALES & TRANSACTIONS (POS)
-- ==========================================

-- 4.1 Sales
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES public.pos_staff(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customer(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    discount NUMERIC(10, 2) DEFAULT 0 CHECK (discount >= 0),
    final_amount NUMERIC(10, 2) NOT NULL CHECK (final_amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'MOBILE_MONEY', 'CARD')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4.2 Sales Items
CREATE TABLE public.sales_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4.3 Payments (Detailed log)
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL CHECK (method IN ('CASH', 'MOBILE_MONEY', 'CARD')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 5. E-COMMERCE SPECIFIC TABLES
-- ==========================================

-- 5.1 Delivery Points
CREATE TABLE public.delivery_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5.2 Online Orders
CREATE TABLE public.online_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    e_customer_id UUID REFERENCES public.e_customer(id) ON DELETE SET NULL,
    delivery_point_id UUID REFERENCES public.delivery_points(id) ON DELETE SET NULL,
    delivery_address TEXT,
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED')),
    payment_method TEXT NOT NULL DEFAULT 'CARD'
        CHECK (payment_method IN ('CARD','MOBILE_MONEY','PAY_ON_DELIVERY')),
    payment_reference TEXT,
    -- Processing fields for POS integration
    processing_staff_id UUID REFERENCES public.pos_staff(id),
    processed_by UUID REFERENCES public.pos_staff(id), -- Redundant but kept for history
    processing_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5.3 Online Order Items
CREATE TABLE public.online_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5.4 Product Reviews
CREATE TABLE public.product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    e_customer_id UUID REFERENCES public.e_customer(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5.5 Persistent E-Commerce Cart
CREATE TABLE public.e_cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    e_customer_id UUID REFERENCES public.e_customer(id) ON DELETE CASCADE UNIQUE,
    items JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5.6 Promotions
CREATE TABLE public.promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_percentage NUMERIC(5, 2) NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 6. POS MANAGEMENT & SETTINGS
-- ==========================================

-- 6.1 Suppliers
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6.2 Purchase Orders (Restocking)
CREATE TABLE public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED')),
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6.3 Purchase Order Items
CREATE TABLE public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6.4 Expenses
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    logged_by UUID REFERENCES public.pos_staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6.5 Store Settings
CREATE TABLE public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name TEXT NOT NULL DEFAULT 'My Store',
    currency TEXT NOT NULL DEFAULT 'USD',
    currency_symbol TEXT DEFAULT '$',
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
    receipt_header TEXT,
    receipt_footer TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 7. HELPERS, TRIGGERS & INDEXES
-- ==========================================

-- 7.1 Updated At Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_e_cart_updated_at BEFORE UPDATE
    ON e_cart FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE
    ON store_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 7.2 Core Indexes
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_product_images_product ON public.product_images(product_id);
CREATE INDEX idx_inventory_product ON public.inventory(product_id);

-- 7.3 Sales Indexes
CREATE INDEX idx_sales_cashier ON public.sales(cashier_id);
CREATE INDEX idx_sales_customer ON public.sales(customer_id);
CREATE INDEX idx_sales_items_sale ON public.sales_items(sale_id);
CREATE INDEX idx_sales_items_product ON public.sales_items(product_id);

-- 7.4 E-Commerce Indexes
CREATE INDEX idx_online_orders_user ON public.online_orders(e_customer_id);
CREATE INDEX idx_online_orders_status ON public.online_orders(status);
CREATE INDEX idx_online_order_items_order ON public.online_order_items(order_id);
CREATE INDEX idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX idx_promotions_code ON public.promotions(code);

-- ==========================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Note: In this application, web clients connect via 'anon' and use direct access.
-- Real-world applications should restrict this!

CREATE POLICY "Allow all to public" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.product_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.pos_staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.customer FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.e_customer FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.sales_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.delivery_points FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.online_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.online_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.product_reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.e_cart FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.promotions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.purchase_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 9. SUPABASE REALTIME
-- ==========================================

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'online_orders',
    'sales',
    'products',
    'inventory',
    'pos_staff',
    'customer',
    'e_customer',
    'e_cart',
    'online_order_items',
    'sales_items'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Table % already in publication', t;
    WHEN undefined_object THEN
      RAISE NOTICE 'Publication supabase_realtime does not exist - please enable it in your Supabase dashboard';
  END;
END LOOP;
$$;

-- ==========================================
-- 10. SEED DATA
-- ==========================================

-- Default Delivery Points
INSERT INTO public.delivery_points (name, address) VALUES
  ('Main Branch Pickup', '123 Commerce Avenue, City Centre'),
  ('North Distribution Hub', '45 Industrial Road, North Side'),
  ('South Depot', '77 Southern Boulevard, South End')
ON CONFLICT DO NOTHING;

-- Default Store Settings
INSERT INTO public.store_settings (store_name, currency, currency_symbol) 
VALUES ('StarMart POS', 'USD', '$') 
ON CONFLICT DO NOTHING;
