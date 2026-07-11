-- ==================================================
-- ACTUALIZACIÓN V3: SUBCATEGORÍAS E IMÁGENES DE INTERFAZ
-- ==================================================

-- 1. Agregar columna de subcategoría a los productos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_category TEXT DEFAULT 'general';

-- Actualizar subcategorías automáticamente basadas en el nombre actual
UPDATE public.products SET sub_category = 'Pases de Nivel' WHERE category = 'free_fire' AND name ILIKE '%Pase de Nivel%';
UPDATE public.products SET sub_category = 'Recargas por ID' WHERE category = 'free_fire' AND sub_category = 'general';
UPDATE public.products SET sub_category = 'Pases Strike' WHERE category = 'blood_strike' AND name ILIKE '%Pass%';
UPDATE public.products SET sub_category = 'Recargas de Oro' WHERE category = 'blood_strike' AND sub_category = 'general';

-- 2. Crear tabla para almacenar las imágenes de la interfaz (Logo, Banners, Iconos)
CREATE TABLE IF NOT EXISTS public.ui_images (
    key TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Políticas de seguridad para ui_images (Todos pueden leer, solo admin actualiza)
ALTER TABLE public.ui_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public puede ver ui_images" ON public.ui_images FOR SELECT USING (true);
CREATE POLICY "Admins pueden modificar ui_images (INSERT)" ON public.ui_images FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins pueden modificar ui_images (UPDATE)" ON public.ui_images FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins pueden modificar ui_images (DELETE)" ON public.ui_images FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Crear Bucket de Storage para alojar las imágenes del sitio
INSERT INTO storage.buckets (id, name, public) VALUES ('site_images', 'site_images', true) ON CONFLICT DO NOTHING;

-- Políticas de seguridad para el bucket site_images
CREATE POLICY "Todos pueden ver imágenes del sitio" ON storage.objects FOR SELECT USING (bucket_id = 'site_images');
CREATE POLICY "Solo admins pueden subir imágenes al sitio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'site_images' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Solo admins pueden borrar imágenes del sitio" ON storage.objects FOR DELETE USING (bucket_id = 'site_images' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Solo admins pueden actualizar imágenes del sitio" ON storage.objects FOR UPDATE USING (bucket_id = 'site_images' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
