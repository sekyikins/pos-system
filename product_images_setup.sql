-- 1. Create product_images table
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS on product_images table
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for anon product_images" ON public.product_images;
CREATE POLICY "Enable all access for anon product_images" ON public.product_images FOR ALL USING (true) WITH CHECK (true);

-- 3. STORAGE BUCKET POLICIES (Run these to allow uploads to the bucket)
-- Note: You must first create the bucket named "Products Images" in the Supabase Dashboard.

-- Allow public access to read images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'Products Images');

-- Allow anonymous uploads (for development)
DROP POLICY IF EXISTS "Anon Uploads" ON storage.objects;
CREATE POLICY "Anon Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'Products Images');

-- Allow anonymous updates/deletes (for development)
DROP POLICY IF EXISTS "Anon Updates" ON storage.objects;
CREATE POLICY "Anon Updates" ON storage.objects FOR UPDATE USING (bucket_id = 'Products Images');

DROP POLICY IF EXISTS "Anon Deletes" ON storage.objects;
CREATE POLICY "Anon Deletes" ON storage.objects FOR DELETE USING (bucket_id = 'Products Images');
