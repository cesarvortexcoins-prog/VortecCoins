-- ==========================================
-- VORTEX COINS V8: INVENTARIO, OFERTAS Y NETFLIX
-- ==========================================
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase.

-- 1. Actualizar campos obligatorios de Netflix
-- Netflix Cuenta Completa (Asumiendo que tiene la palabra 'completa' o similar, 
-- pero por seguridad usaremos un UPDATE general para todos los productos de Streaming 
-- que sean Netflix y no sean perfiles, y otro para perfiles).

UPDATE public.products 
SET required_fields = '[
  {"name": "whatsapp", "label": "Tu WhatsApp para entregarte la cuenta", "type": "text", "placeholder": "Ej: +584120000000"}
]'::jsonb
WHERE category = 'streaming' AND name ILIKE '%netflix%' AND name NOT ILIKE '%perfil%';

UPDATE public.products 
SET required_fields = '[
  {"name": "whatsapp", "label": "Tu WhatsApp", "type": "text", "placeholder": "Ej: +584120000000"},
  {"name": "profile_name", "label": "Nombre para el Perfil", "type": "text", "placeholder": "Ej: Carlos"},
  {"name": "pin", "label": "PIN de 4 dígitos", "type": "number", "placeholder": "Ej: 1234"}
]'::jsonb
WHERE category = 'streaming' AND name ILIKE '%netflix%' AND name ILIKE '%perfil%';

-- 2. Crear Tabla de Inventario (Auto-entrega)
CREATE TABLE IF NOT EXISTS public.product_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    account_data JSONB NOT NULL, -- Ej: {"email": "x@x.com", "password": "123", "profile": "A"}
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold')) NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL, -- Se llena cuando se vende
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS en Inventario
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;

-- Políticas de Inventario (Solo admin puede ver y editar el inventario no vendido, pero el sistema puede asignarlo)
DROP POLICY IF EXISTS "Admin full access inventory" ON public.product_inventory;
CREATE POLICY "Admin full access inventory" ON public.product_inventory
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Users can view their own purchased inventory" ON public.product_inventory;
CREATE POLICY "Users can view their own purchased inventory" ON public.product_inventory
    FOR SELECT USING (
        order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    );

-- 3. Crear Tabla de Ofertas Especiales (Carrusel)
CREATE TABLE IF NOT EXISTS public.special_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    price_usdt NUMERIC(10,2) NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT, -- Si es nulo, aparece en la página de inicio. Si tiene 'free_fire', solo ahí.
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS en Ofertas
ALTER TABLE public.special_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cualquiera puede ver ofertas activas" ON public.special_offers;
CREATE POLICY "Cualquiera puede ver ofertas activas" ON public.special_offers
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin full access ofertas" ON public.special_offers;
CREATE POLICY "Admin full access ofertas" ON public.special_offers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
