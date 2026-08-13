-- ============================================================
-- MIGRACION v20: ARREGLO DEFINITIVO - OFERTAS + INVITADOS
-- Corre esto en Supabase -> SQL Editor -> New Query -> Run
-- ============================================================

-- 1. Permitir que product_id sea NULL (para Ofertas Especiales)
ALTER TABLE public.orders ALTER COLUMN product_id DROP NOT NULL;

-- 2. Eliminar TODAS las politicas INSERT de orders existentes
DROP POLICY IF EXISTS "Clientes crean ordenes" ON public.orders;
DROP POLICY IF EXISTS "Clientes crean ordenes" ON public.orders;
DROP POLICY IF EXISTS "Anonimos crean ordenes" ON public.orders;
DROP POLICY IF EXISTS "Permitir compras de invitados" ON public.orders;
DROP POLICY IF EXISTS "Clientes y Invitados crean ordenes" ON public.orders;

-- 3. Nueva politica unica que permite tanto logueados como invitados
CREATE POLICY "Clientes y Invitados crean ordenes" ON public.orders
FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    (user_id IS NULL)
);

-- 4. Storage: permitir a invitados subir captura de pago
DROP POLICY IF EXISTS "Clientes pueden subir captures" ON storage.objects;
DROP POLICY IF EXISTS "Todos pueden subir captures" ON storage.objects;
DROP POLICY IF EXISTS "Todos pueden subir payment_proofs" ON storage.objects;

CREATE POLICY "Todos pueden subir captures" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'payment_proofs');
