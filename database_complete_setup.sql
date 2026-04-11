-- =============================================================================
-- UNIFIED DATABASE SETUP SCRIPT FOR TECHFLOW POS & E-COMMERCE (REFACTORED)
-- =============================================================================
-- This script creates the entire database from scratch with normalized schema.
-- WARNING: Running this will drop and recreate the public schema!
-- =============================================================================

-- 0. INITIAL SETUP
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

SET search_path = public;

-- Enable UUID and Crypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. CORE ENTITIES
-- ==========================================

-- 1.1 Categories
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 1.2 Suppliers
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 1.3 POS Staff
CREATE TABLE public.pos_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'CASHIER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 1.4 Unified Customers (In-store & Online)
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT, -- For online customers
    phone TEXT,
    loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
    last_purchase_date DATE,
    order_count INTEGER DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'IN_STORE' CHECK (type IN ('IN_STORE', 'ONLINE', 'BOTH')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 1.5 Payment Methods
CREATE TABLE public.payment_methods (
    id TEXT PRIMARY KEY, -- 'CASH', 'PAYSTACK', 'PAY_ON_DELIVERY'
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true
);

-- 1.6 Delivery Points
CREATE TABLE public.delivery_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 2. PRODUCTS & INVENTORY
-- ==========================================

-- 2.1 Products
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category TEXT NOT NULL, -- Redundant but kept for quick grouping
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    barcode TEXT UNIQUE NOT NULL,
    description TEXT,
    is_returnable BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2.2 Product Images
CREATE TABLE public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2.3 Product-Supplier Links
CREATE TABLE public.product_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(product_id, supplier_id)
);

-- 2.4 Inventory Logs
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    change INTEGER NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('RESTOCK', 'SALE', 'ADJUSTMENT', 'LOSS', 'RETURN', 'PURCHASE_ORDER')),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.pos_staff(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 3. PROMOTIONS
-- ==========================================

-- 3.1 Promotions
CREATE TABLE public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'PERCENT' CHECK (discount_type IN ('FLAT', 'PERCENT')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
    min_subtotal NUMERIC(10, 2) DEFAULT 0 CHECK (min_subtotal >= 0),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 4. SALES & ORDERS (TRANSACTIONS)
-- ==========================================

-- 4.1 Sales (POS Transactions)
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID NOT NULL REFERENCES public.pos_staff(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    discount NUMERIC(10, 2) DEFAULT 0 CHECK (discount >= 0),
    final_amount NUMERIC(10, 2) NOT NULL CHECK (final_amount >= 0),
    payment_method_id TEXT REFERENCES public.payment_methods(id),
    payment_reference TEXT,
    promotion_id UUID REFERENCES public.promotions(id),
    is_returned BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4.2 Online Orders
CREATE TABLE public.online_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    delivery_point_id UUID REFERENCES public.delivery_points(id) ON DELETE SET NULL,
    delivery_address TEXT,
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED')),
    payment_method_id TEXT REFERENCES public.payment_methods(id),
    payment_reference TEXT,
    promotion_id UUID REFERENCES public.promotions(id),
    -- Processing fields for POS integration
    start_process_staff_id UUID REFERENCES public.pos_staff(id),
    end_process_staff_id UUID REFERENCES public.pos_staff(id),
    processing_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_returned BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4.3 Unified Order/Transaction Items (NO product_name)
CREATE TABLE public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.online_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    -- Constraint: item must belong to either a sale or an online order, but not both
    CONSTRAINT item_transaction_source CHECK (
        (sale_id IS NOT NULL AND order_id IS NULL) OR
        (sale_id IS NULL AND order_id IS NOT NULL)
    )
);

-- 4.4 Payments log (Referencing sales or orders)
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.online_orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method_id TEXT REFERENCES public.payment_methods(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT payment_source CHECK (
        (sale_id IS NOT NULL AND order_id IS NULL) OR
        (sale_id IS NULL AND order_id IS NOT NULL)
    )
);

-- 4.5 Returns
CREATE TABLE public.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.online_orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    initiated_by_staff_id UUID REFERENCES public.pos_staff(id) ON DELETE SET NULL,
    processed_by_staff_id UUID REFERENCES public.pos_staff(id) ON DELETE SET NULL,
    source TEXT NOT NULL CHECK (source IN ('IN_STORE', 'ONLINE')),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'REQUESTED'
        CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED')),
    refund_amount NUMERIC(10,2),
    rejection_reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT return_source_check CHECK (
        (sale_id IS NOT NULL AND order_id IS NULL) OR
        (sale_id IS NULL AND order_id IS NOT NULL)
    )
);

-- 4.6 Return Items
CREATE TABLE public.return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(return_id, product_id)
);

-- ==========================================
-- 5. OTHERS (REVIEWS, EXPENSES, POs ...)
-- ==========================================

-- 5.1 Product Reviews
CREATE TABLE public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5.2 Purchase Orders (Restocking)
CREATE TABLE public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED')),
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5.3 Purchase Order Items
CREATE TABLE public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5.4 Expenses
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    logged_by UUID REFERENCES public.pos_staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5.5 Store Settings
CREATE TABLE public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT NOT NULL DEFAULT 'My Store',
    currency TEXT NOT NULL DEFAULT 'USD',
    currency_symbol TEXT DEFAULT '$',
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 2.5 CHECK (tax_rate >= 0),
    receipt_header TEXT,
    receipt_footer TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 6. HELPERS, TRIGGERS & INDEXES
-- ==========================================

-- 6.1 Updated At Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE
    ON store_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6.2 Core Indexes
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_inventory_product ON public.inventory(product_id);
CREATE INDEX idx_customers_email ON public.customers(email);

-- 6.3 Transaction Indexes
CREATE INDEX idx_sales_customer ON public.sales(customer_id);
CREATE INDEX idx_online_orders_customer ON public.online_orders(customer_id);
CREATE INDEX idx_transaction_items_sale ON public.transaction_items(sale_id);
CREATE INDEX idx_transaction_items_order ON public.transaction_items(order_id);
CREATE INDEX idx_transaction_items_product ON public.transaction_items(product_id);

-- ==========================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- Note: Static open policy for simplicity (as requested previously)
CREATE POLICY "Allow all to public" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.product_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.pos_staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.payment_methods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.delivery_points FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.online_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.transaction_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.product_reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.promotions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.purchase_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.product_suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.returns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to public" ON public.return_items FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 8. SUPABASE REALTIME
-- ==========================================

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'online_orders',
    'sales',
    'products',
    'inventory',
    'pos_staff',
    'customers',
    'transaction_items',
    'product_suppliers',
    'payment_methods',
    'promotions',
    'returns',
    'return_items'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Table % already in publication', t;
      WHEN undefined_object THEN
        RAISE NOTICE 'Publication supabase_realtime does not exist';
    END;
  END LOOP;
END;
$$;

-- ==========================================
-- 9. INITIAL CONFIGURATION
-- ==========================================

-- Standard Payment Methods
INSERT INTO public.payment_methods (id, name) VALUES
  ('CASH', 'Cash Payment'),
  ('PAYSTACK', 'Paystack Online'),
  ('PAY_ON_DELIVERY', 'Pay on Delivery')
ON CONFLICT DO NOTHING;

-- Default Delivery Points
INSERT INTO public.delivery_points (name, address) VALUES
  ('Main Branch Pickup', '123 Commerce Avenue, City Centre')
ON CONFLICT DO NOTHING;

-- Default Store Settings
INSERT INTO public.store_settings (store_name, currency, currency_symbol, tax_rate) 
VALUES ('StarMart', 'GHS', '₵', 2.5) 
ON CONFLICT DO NOTHING;

-- Default Admin Staff Account
-- (Username: admin / Password: admin123)
INSERT INTO public.pos_staff (username, name, password_hash, role)
VALUES ('admin', 'System Admin', '$2a$10$KawHLW/S6SkNdBuwVsdUd.k6vZ9FdzQQynxh.XRzc/CwxGRiqBIRq', 'ADMIN')
ON CONFLICT DO NOTHING;

-- ==========================================
-- 10. FINAL PERMISSIONS
-- ==========================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
