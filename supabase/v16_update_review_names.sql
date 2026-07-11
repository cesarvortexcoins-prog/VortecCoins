-- ==========================================
-- VORTEX COINS V16: ACTUALIZAR NOMBRES DE RESEÑAS EXISTENTES
-- ==========================================
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase.

UPDATE public.reviews
SET author_name = profiles.full_name
FROM public.profiles
WHERE reviews.user_id = profiles.id
  AND reviews.author_name = 'Usuario';
