-- ==========================================
-- VORTEX COINS: ESQUEMA DE BASE DE DATOS
-- ==========================================
-- Instrucciones:
-- 1. Inicia sesión en tu cuenta de Supabase (supabase.com) y entra a tu proyecto.
-- 2. En el menú de la izquierda, haz clic en "SQL Editor".
-- 3. Crea un nuevo query (New Query) y pega todo este código allí.
-- LIMPIEZA PREVIA (Por si ejecutas el script más de una vez)
-- Esto elimina lo que ya se haya creado para evitar el error "already exists".
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.clean_sensitive_order_data() CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS user_tier CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 1. CREACIÓN DE TIPOS (ENUMS)
-- Los tipos Enum nos ayudan a restringir los valores que puede tener una columna,
-- evitando errores (ej. que alguien escriba "adminn" en lugar de "admin").
CREATE TYPE public.user_role AS ENUM ('admin', 'client');
CREATE TYPE public.user_tier AS ENUM ('standard', 'special', 'reseller');
CREATE TYPE public.order_status AS ENUM ('pending_payment', 'reviewing_payment', 'processing', 'completed', 'rejected');



-- 2. TABLAS PRINCIPALES

-- Tabla: perfiles de usuario (Extiende la tabla de autenticación nativa de Supabase)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY, -- Se vincula automáticamente con el usuario registrado
    role user_role DEFAULT 'client' NOT NULL, -- Por defecto todos son clientes
    tier user_tier DEFAULT 'standard' NOT NULL, -- Por defecto todos tienen precio estándar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla: productos
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- Nombre del producto (Ej: "100+10 Diamantes")
    category TEXT NOT NULL, -- Categoría (Ej: "free_fire", "blood_strike", "streaming")
    price_bs NUMERIC NOT NULL, -- Precio en Bolívares
    price_usdt NUMERIC NOT NULL, -- Precio en USDT
    required_fields JSONB DEFAULT '[]'::jsonb NOT NULL, -- Campos que pide el producto (Ej: [{"name": "playerId", "type": "text"}])
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla: configuraciones globales (Para mensajes de WhatsApp, etc)
CREATE TABLE public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    whatsapp_templates JSONB DEFAULT '{"completed": "¡Hola! Tu pedido está listo.", "processing": "Estamos procesando tu pedido."}'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla: órdenes (pedidos)
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Si se borra el usuario, mantenemos el registro de la venta (queda NULL)
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL, -- No se puede borrar un producto si tiene órdenes
    status order_status DEFAULT 'pending_payment' NOT NULL, -- Estado inicial
    order_data JSONB NOT NULL, -- Aquí se guardará el ID del jugador, Correo del pase, etc.
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pago_movil', 'binance')),
    payment_proof_url TEXT, -- Link de la foto del capture subido a Supabase Storage
    amount_paid NUMERIC NOT NULL, -- Cuánto pagó exactamente
    currency TEXT NOT NULL CHECK (currency IN ('BS', 'USDT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- 3. FUNCIONES AUTOMÁTICAS (TRIGGERS)

-- Función para crear un perfil automáticamente cada vez que alguien se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, tier)
  VALUES (new.id, 'client', 'standard');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador que ejecuta la función handle_new_user al insertarse en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Función para limpiar datos sensibles (contraseñas) de la orden cuando se completa
CREATE OR REPLACE FUNCTION public.clean_sensitive_order_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el estado cambia a 'completed', modificamos el JSONB para borrar contraseñas si existen
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Buscamos si hay un campo 'password' o 'pin' en order_data y lo ocultamos
    IF NEW.order_data ? 'password' THEN
      NEW.order_data = jsonb_set(NEW.order_data, '{password}', '"[ELIMINADO_POR_SEGURIDAD]"');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Disparador que limpia los datos antes de actualizar la orden a completada
CREATE TRIGGER clean_data_on_complete
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.clean_sensitive_order_data();


-- 4. REGLAS DE SEGURIDAD (Row Level Security - RLS)
-- Las políticas de RLS protegen la base de datos para que los clientes no puedan modificar o ver datos ajenos.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles:
-- Cualquiera puede leer su propio perfil. Los admins pueden leer todos.
CREATE POLICY "Usuarios leen su perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins leen todos los perfiles" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
-- Solo admins pueden modificar perfiles (ej. para subir el tier)
CREATE POLICY "Admins modifican perfiles" ON public.profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para Products:
-- Todo el mundo puede ver los productos
CREATE POLICY "Todo el mundo lee productos" ON public.products FOR SELECT USING (true);
-- Solo admins pueden insertar/actualizar/borrar productos
CREATE POLICY "Admins gestionan productos (INSERT)" ON public.products FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins gestionan productos (UPDATE)" ON public.products FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins gestionan productos (DELETE)" ON public.products FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para Settings:
-- Solo admins leen y modifican settings
CREATE POLICY "Admins gestionan settings (SELECT)" ON public.settings FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins gestionan settings (UPDATE)" ON public.settings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para Orders:
-- Clientes pueden insertar sus propias órdenes
CREATE POLICY "Clientes crean órdenes" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Clientes pueden leer sus propias órdenes
CREATE POLICY "Clientes leen sus órdenes" ON public.orders FOR SELECT USING (auth.uid() = user_id);
-- Admins pueden leer y modificar todas las órdenes
CREATE POLICY "Admins leen todas las órdenes" ON public.orders FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins actualizan órdenes" ON public.orders FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. STORAGE (Almacenamiento para Captures de Pago)
-- Tendrás que crear un "Bucket" en Supabase Storage llamado "payment_proofs" manualmente o si corres este script también lo crea.
INSERT INTO storage.buckets (id, name, public) VALUES ('payment_proofs', 'payment_proofs', false) ON CONFLICT DO NOTHING;

-- Políticas para Storage (Bucket: payment_proofs):
CREATE POLICY "Clientes pueden subir captures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment_proofs' AND auth.uid() = owner);
CREATE POLICY "Admins pueden ver captures" ON storage.objects FOR SELECT USING (bucket_id = 'payment_proofs' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Clientes pueden ver sus propios captures" ON storage.objects FOR SELECT USING (bucket_id = 'payment_proofs' AND auth.uid() = owner);
