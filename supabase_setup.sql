-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. USERS TABLE
-- ==========================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'CASHIER')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. PRODUCTS TABLE
-- ==========================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  barcode TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==========================================
-- 4. SALES TABLE
-- ==========================================
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  discount NUMERIC(10, 2) DEFAULT 0 CHECK (discount >= 0),
  final_amount NUMERIC(10, 2) NOT NULL CHECK (final_amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'MOBILE_MONEY', 'CARD')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 5. SALES_ITEMS TABLE
-- ==========================================
CREATE TABLE public.sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL, -- Stored here to preserve history if product name changes
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0), -- Price at the time of sale
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 6. INVENTORY TABLE
-- ==========================================
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  change INTEGER NOT NULL, -- Positive for restock, negative for sale/loss
  reason TEXT NOT NULL CHECK (reason IN ('RESTOCK', 'SALE', 'ADJUSTMENT')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 7. PAYMENTS TABLE
-- ==========================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('CASH', 'MOBILE_MONEY', 'CARD')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- RLS (ROW LEVEL SECURITY) AND POLICIES
-- ==========================================
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create default policies allowing ALL access for anon so your application works directly.
-- In a real-world scenario, you would restrict these based on authenticated users and roles!
CREATE POLICY "Enable all access for anon users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon sales_items" ON public.sales_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_sales_cashier ON public.sales(cashier_id);
CREATE INDEX idx_sales_items_sale ON public.sales_items(sale_id);
CREATE INDEX idx_sales_items_product ON public.sales_items(product_id);
CREATE INDEX idx_inventory_product ON public.inventory(product_id);
CREATE INDEX idx_payments_sale ON public.payments(sale_id);
