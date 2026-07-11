-- ==========================================
-- VORTEX COINS V14: PERMITIR COMPRAS DE OFERTAS ESPECIALES
-- ==========================================
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase.

-- Para poder procesar las compras de "Ofertas Especiales" que no están en la tabla "products",
-- necesitamos permitir que product_id en la tabla "orders" pueda estar vacío (NULL).
ALTER TABLE public.orders ALTER COLUMN product_id DROP NOT NULL;

-- Las compras guardarán el nombre de la oferta en "order_data" de forma automática.
