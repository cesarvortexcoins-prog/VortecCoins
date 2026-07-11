-- ==================================================
-- ACTUALIZACIÓN V4: BUCKET DE PAGOS, RESEÑAS Y OPTIMIZACIÓN
-- ==================================================

-- 1. Crear Bucket de Storage para alojar las capturas de los pagos
INSERT INTO storage.buckets (id, name, public) VALUES ('payment_proofs', 'payment_proofs', true) ON CONFLICT DO NOTHING;

-- Políticas de seguridad para el bucket payment_proofs
-- Todo el mundo puede ver las imágenes (los administradores y para renderizar en el panel)
CREATE POLICY "Todos pueden ver payment_proofs" ON storage.objects FOR SELECT USING (bucket_id = 'payment_proofs');

-- Los usuarios (autenticados o anónimos, dependiendo de tu registro) pueden subir su pago al checkout
-- Si permites checkout sin cuenta, cambia `auth.uid() IS NOT NULL` por `true`
CREATE POLICY "Todos pueden subir payment_proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment_proofs');


-- 2. Crear tabla para las reseñas (comentarios de clientes)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Políticas de seguridad para reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver las reseñas
CREATE POLICY "Public puede ver reviews" ON public.reviews FOR SELECT USING (true);

-- Usuarios autenticados pueden crear reseñas
CREATE POLICY "Usuarios autenticados pueden dejar reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins pueden borrar reseñas inapropiadas
CREATE POLICY "Admins pueden borrar reviews" ON public.reviews FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
