-- ==================================================
-- ACTUALIZACIÓN V5: POLÍTICAS DE PERFIL Y CAMBIO DE CLAVE
-- ==================================================

-- 1. Eliminar el trigger automático de creación de perfil si existe
-- Esto evita conflictos de duplicados y permite que el frontend lo guarde correctamente.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- 2. Asegurar que las políticas RLS para profiles permitan INSERT y UPDATE al propio usuario
DROP POLICY IF EXISTS "Cualquiera puede crear su perfil al registrarse" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios leen su perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil (nombre)" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Cualquiera puede crear su perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios leen su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON public.profiles;

CREATE POLICY "Cualquiera puede crear su perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuarios leen su propio perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuarios actualizan su propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Crear función de base de datos para que el Admin cambie la contraseña de cualquier usuario
CREATE OR REPLACE FUNCTION public.admin_set_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
  -- Verificar si el usuario que llama es administrador
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;
  ELSE
    RAISE EXCEPTION 'No autorizado. Debes ser administrador.';
  END IF;
END;
$$ LANGUAGE plpgsql;
