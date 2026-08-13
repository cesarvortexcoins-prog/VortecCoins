-- ============================================================
-- MIGRACION v22: ARREGLO DE NOTIFICACIONES PARA INVITADOS
-- ============================================================
-- Corre esto en Supabase -> SQL Editor -> New Query -> Run
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_order_changes()
RETURNS TRIGGER AS $}
DECLARE
    admin_record RECORD;
    product_name TEXT;
BEGIN
    -- Obtenemos el nombre del producto (si lo hay)
    SELECT name INTO product_name FROM public.products WHERE id = NEW.product_id;

    -- Si es una orden NUEVA (INSERT)
    IF TG_OP = 'INSERT' THEN
        -- Notificar a todos los admins
        FOR admin_record IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
            INSERT INTO public.notifications (user_id, message, link, type)
            VALUES (
                admin_record.id, 
                'Nuevo pedido de ' || COALESCE(product_name, 'oferta o producto') || ' por procesar.', 
                '#panel', 
                'admin_alert'
            );
        END LOOP;
    
    -- Si es una ACTUALIZACION de estado (UPDATE)
    ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
        
        -- SOLO enviar notificacion al cliente si NO ES UN INVITADO (tiene user_id)
        IF NEW.user_id IS NOT NULL THEN
            IF NEW.status = 'processing' THEN
                INSERT INTO public.notifications (user_id, message, link, type)
                VALUES (
                    NEW.user_id, 
                    'Tu pedido de ' || COALESCE(product_name, 'oferta o producto') || ' esta siendo procesado.', 
                    '#dashboard',
                    'order_update'
                );
            ELSIF NEW.status = 'completed' THEN
                INSERT INTO public.notifications (user_id, message, link, type)
                VALUES (
                    NEW.user_id, 
                    '¡Tu pedido de ' || COALESCE(product_name, 'oferta o producto') || ' ha sido completado!', 
                    '#dashboard',
                    'order_update'
                );
            ELSIF NEW.status = 'rejected' THEN
                INSERT INTO public.notifications (user_id, message, link, type)
                VALUES (
                    NEW.user_id, 
                    'Tu pedido de ' || COALESCE(product_name, 'oferta o producto') || ' ha sido rechazado. Verifica el pago.', 
                    '#dashboard',
                    'order_update'
                );
            END IF;
        END IF;

    END IF;
    
    RETURN NEW;
END;
$} LANGUAGE plpgsql SECURITY DEFINER;
