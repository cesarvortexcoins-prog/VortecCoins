-- ============================================================
-- SCRIPT DEFINITIVO DE CORRECCION (V21)
-- ============================================================

-- 1. Asegurar que product_id puede ser nulo
ALTER TABLE public.orders ALTER COLUMN product_id DROP NOT NULL;

-- 2. Eliminar todas las politicas existentes de INSERT para evitar conflictos
DROP POLICY IF EXISTS "Clientes crean ordenes" ON public.orders;
DROP POLICY IF EXISTS "Clientes crean órdenes" ON public.orders;
DROP POLICY IF EXISTS "Anonimos crean ordenes" ON public.orders;
DROP POLICY IF EXISTS "Anonimos crean órdenes" ON public.orders;
DROP POLICY IF EXISTS "Permitir compras de invitados" ON public.orders;
DROP POLICY IF EXISTS "Clientes y Invitados crean ordenes" ON public.orders;
DROP POLICY IF EXISTS "Permitir todos inserts" ON public.orders;

-- 3. Crear una politica universal y segura para INSERTS
-- "true" significa que cualquiera (invitado o cliente) puede crear una orden
CREATE POLICY "Permitir todos inserts" ON public.orders 
FOR INSERT WITH CHECK (true);

-- 4. Asegurar que todos puedan subir fotos (captures)
DROP POLICY IF EXISTS "Clientes pueden subir captures" ON storage.objects;
DROP POLICY IF EXISTS "Todos pueden subir captures" ON storage.objects;
DROP POLICY IF EXISTS "Todos pueden subir payment_proofs" ON storage.objects;

CREATE POLICY "Todos pueden subir captures" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'payment_proofs');
