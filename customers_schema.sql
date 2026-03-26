CREATE TABLE IF NOT EXISTS public.pos_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.pos_customers(id) ON DELETE SET NULL;

ALTER TABLE public.pos_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for anon pos_customers" ON public.pos_customers FOR ALL USING (true) WITH CHECK (true);
