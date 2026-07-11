-- ==========================================
-- VORTEX COINS V15: NOTA EN OFERTAS ESPECIALES
-- ==========================================
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase.

-- Agregar columna 'note' a la tabla 'special_offers'
ALTER TABLE public.special_offers ADD COLUMN IF NOT EXISTS note TEXT;
