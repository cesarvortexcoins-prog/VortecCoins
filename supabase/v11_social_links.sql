-- ==========================================
-- VORTEX COINS V11: REDES SOCIALES EN CONFIGURACIÓN
-- ==========================================

-- Añadir columnas para enlaces de redes sociales a la tabla settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS social_facebook TEXT DEFAULT '';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS social_instagram TEXT DEFAULT '';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS social_tiktok TEXT DEFAULT '';
