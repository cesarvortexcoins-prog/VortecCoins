-- v12_special_offers_and_reviews.sql
-- 1. Añadir required_fields a special_offers
ALTER TABLE public.special_offers ADD COLUMN IF NOT EXISTS required_fields JSONB DEFAULT '[]'::jsonb;

-- 2. Asegurarse de que la tabla reviews exista y tenga author_name
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    author_name TEXT DEFAULT 'Usuario',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT 'Usuario';
UPDATE public.reviews SET author_name = 'Usuario' WHERE author_name IS NULL;

-- 3. Políticas para reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public puede ver reviews" ON public.reviews;
CREATE POLICY "Public puede ver reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden dejar reviews" ON public.reviews;
CREATE POLICY "Usuarios autenticados pueden dejar reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins pueden borrar reviews" ON public.reviews;
CREATE POLICY "Admins pueden borrar reviews" ON public.reviews FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
