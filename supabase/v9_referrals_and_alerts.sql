-- ==========================================
-- VORTEX COINS V9: REFERIDOS Y ALERTAS GLOBALES
-- ==========================================

-- 1. Añadir columnas para Referidos en perfiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- Generar código para los usuarios existentes que no tengan
UPDATE public.profiles 
SET referral_code = upper(substr(md5(random()::text), 1, 8))
WHERE referral_code IS NULL;

-- Asegurar que nadie inserte perfiles sin código en el futuro (Opcional, pero recomendado)
CREATE OR REPLACE FUNCTION public.generate_referral_code_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := upper(substr(md5(random()::text), 1, 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.profiles;
CREATE TRIGGER trg_generate_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.generate_referral_code_trigger();

-- 2. Función para Canjear Código de Referido (Asciende a ambos a Especial)
CREATE OR REPLACE FUNCTION public.apply_referral_code(
    p_target_user_id UUID,
    p_referral_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_owner_id UUID;
    v_owner_tier user_tier;
    v_target_tier user_tier;
BEGIN
    -- Verificar si el código existe y de quién es
    SELECT id, tier INTO v_owner_id, v_owner_tier 
    FROM public.profiles 
    WHERE referral_code = upper(p_referral_code)
    LIMIT 1;

    -- Si no existe el código o es del mismo usuario, abortar
    IF v_owner_id IS NULL OR v_owner_id = p_target_user_id THEN
        RETURN FALSE;
    END IF;

    -- Actualizar al objetivo (el nuevo usuario)
    UPDATE public.profiles 
    SET referred_by = v_owner_id,
        tier = 'especial'
    WHERE id = p_target_user_id AND referred_by IS NULL;

    -- Si se actualizó correctamente (significa que no había usado código antes)
    IF FOUND THEN
        -- Si el dueño del código es 'cliente', subirlo a 'especial'
        IF v_owner_tier = 'cliente' THEN
            UPDATE public.profiles SET tier = 'especial' WHERE id = v_owner_id;
        END IF;

        -- Enviar notificación al dueño del código
        INSERT INTO public.notifications (user_id, message, type)
        VALUES (v_owner_id, '¡Felicidades! Un usuario se registró con tu código. Tú y tu referido ahora son Grado Especial.', 'info');
        
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Función para Enviar Alertas Globales
CREATE OR REPLACE FUNCTION public.send_global_alert(
    p_message TEXT,
    p_link TEXT DEFAULT '#'
) RETURNS VOID AS $$
BEGIN
    -- Verificar que quien llama a la función sea Admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    -- Insertar notificación para todos los perfiles
    INSERT INTO public.notifications (user_id, message, link, type)
    SELECT id, p_message, p_link, 'info' FROM public.profiles;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
