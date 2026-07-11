-- ==========================================
-- VORTEX COINS V10: FIX RESEÑAS Y NOMBRES DE USUARIO
-- ==========================================
-- El problema era que las políticas de seguridad (RLS) impedían a los usuarios públicos
-- leer los nombres de otras personas en la tabla de perfiles, por seguridad.
-- La solución es guardar el nombre del autor directamente en la reseña al crearla.

-- 1. Añadir columna del autor
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS author_name TEXT;

-- 2. Llenar los nombres de las reseñas existentes (Saltándose la seguridad temporalmente por ser Admin)
UPDATE public.reviews r 
SET author_name = p.full_name 
FROM public.profiles p 
WHERE r.user_id = p.id;

-- Si quedó alguna sin nombre
UPDATE public.reviews SET author_name = 'Usuario' WHERE author_name IS NULL;

-- 3. Crear función automática (Trigger) que guarde el nombre del usuario cada vez que deje una reseña
CREATE OR REPLACE FUNCTION public.set_review_author_name()
RETURNS TRIGGER AS $$
BEGIN
    -- Obtenemos el nombre del perfil (Se ejecuta como superusuario gracias a SECURITY DEFINER)
    SELECT full_name INTO NEW.author_name FROM public.profiles WHERE id = NEW.user_id;
    
    IF NEW.author_name IS NULL THEN
        NEW.author_name := 'Usuario';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Aplicar el Trigger a la tabla de reseñas
DROP TRIGGER IF EXISTS trg_set_review_author ON public.reviews;
CREATE TRIGGER trg_set_review_author
BEFORE INSERT ON public.reviews
FOR EACH ROW
EXECUTE PROCEDURE public.set_review_author_name();
