-- ==========================================
-- VORTEX COINS V5: SISTEMA DE NOTIFICACIONES
-- ==========================================
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase.

-- 1. Crear la tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    link TEXT DEFAULT '#',
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Reglas de Seguridad (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver y actualizar (marcar como leídas) SUS PROPIAS notificaciones
CREATE POLICY "Usuarios ven sus notificaciones" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus notificaciones" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Los usuarios no pueden crear notificaciones directamente (solo el sistema/triggers las crean)
-- Por lo tanto, no hay política de INSERT para usuarios públicos.

-- 3. Activar Realtime para la tabla de notificaciones
-- Esto es crucial para que la campana se actualice al instante sin recargar la página.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 4. Función de Notificación Automática (Trigger)
CREATE OR REPLACE FUNCTION public.notify_on_order_changes()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
    product_name TEXT;
BEGIN
    -- Obtenemos el nombre del producto para una mejor notificación
    SELECT name INTO product_name FROM public.products WHERE id = NEW.product_id;

    -- Si es una orden NUEVA (INSERT)
    IF TG_OP = 'INSERT' THEN
        -- Notificar a todos los admins
        FOR admin_record IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
            INSERT INTO public.notifications (user_id, message, link, type)
            VALUES (
                admin_record.id, 
                'Nuevo pedido de ' || COALESCE(product_name, 'producto') || ' por procesar.', 
                '#panel', 
                'admin_alert'
            );
        END LOOP;
    
    -- Si es una ACTUALIZACIÓN de estado (UPDATE) y el estado cambió
    ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
        IF NEW.status = 'processing' THEN
            INSERT INTO public.notifications (user_id, message, link, type)
            VALUES (
                NEW.user_id, 
                'Tu pedido de ' || COALESCE(product_name, 'producto') || ' está siendo procesado.', 
                '#dashboard',
                'order_update'
            );
        ELSIF NEW.status = 'completed' THEN
            INSERT INTO public.notifications (user_id, message, link, type)
            VALUES (
                NEW.user_id, 
                '¡Tu pedido de ' || COALESCE(product_name, 'producto') || ' ha sido completado!', 
                '#dashboard',
                'order_update'
            );
        ELSIF NEW.status = 'rejected' THEN
            INSERT INTO public.notifications (user_id, message, link, type)
            VALUES (
                NEW.user_id, 
                'Tu pedido de ' || COALESCE(product_name, 'producto') || ' ha sido rechazado. Verifica el pago.', 
                '#dashboard',
                'order_update'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Vincular el Trigger a la tabla de órdenes
DROP TRIGGER IF EXISTS on_order_changes ON public.orders;
CREATE TRIGGER on_order_changes
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.notify_on_order_changes();
