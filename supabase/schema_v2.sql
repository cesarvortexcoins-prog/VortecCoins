-- ==========================================
-- VORTEX COINS V2: ESQUEMA DE BASE DE DATOS
-- ==========================================
-- Instrucciones:
-- 1. Inicia sesión en tu cuenta de Supabase (supabase.com) y entra a tu proyecto.
-- 2. En el menú de la izquierda, haz clic en "SQL Editor".
-- 3. Crea un nuevo query (New Query) y pega todo este código allí.
-- 4. Haz clic en "Run" para actualizar tu base de datos a la V2.

-- LIMPIEZA PREVIA (Elimina las tablas viejas de la V1 para crear las nuevas)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS clean_data_on_complete ON public.orders CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.clean_sensitive_order_data() CASCADE;

DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.deposits CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS deposit_status CASCADE;
DROP TYPE IF EXISTS user_tier CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 1. CREACIÓN DE TIPOS (ENUMS)
CREATE TYPE public.user_role AS ENUM ('admin', 'client');
CREATE TYPE public.user_tier AS ENUM ('proveedor', 'cliente', 'especial', 'revendedor');
CREATE TYPE public.order_status AS ENUM ('reviewing_payment', 'processing', 'completed', 'rejected');
CREATE TYPE public.deposit_status AS ENUM ('pending', 'approved', 'rejected');


-- 2. TABLAS PRINCIPALES

-- Tabla: Perfiles de usuario (Ahora incluye nombre, whatsapp y saldo)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL DEFAULT 'Usuario',
    whatsapp TEXT NOT NULL DEFAULT '',
    balance NUMERIC DEFAULT 0 NOT NULL, -- Saldo en Billetera (USDT)
    role user_role DEFAULT 'client' NOT NULL,
    tier user_tier DEFAULT 'cliente' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla: Productos (Ahora incluye los 4 precios en USDT)
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price_usdt_proveedor NUMERIC NOT NULL,
    price_usdt_cliente NUMERIC NOT NULL,
    price_usdt_especial NUMERIC NOT NULL,
    price_usdt_revendedor NUMERIC NOT NULL,
    required_fields JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla: Configuraciones Globales (Ahora incluye la Tasa del Dólar)
CREATE TABLE public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exchange_rate NUMERIC DEFAULT 40.00 NOT NULL, -- Tasa de cambio global
    whatsapp_templates JSONB DEFAULT '{"completed": "¡Hola! Tu pedido está listo.", "processing": "Estamos procesando tu pedido."}'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insertar configuración inicial
INSERT INTO public.settings (exchange_rate) VALUES (800.00);

-- Tabla: Órdenes (Pedidos)
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
    status order_status DEFAULT 'reviewing_payment' NOT NULL,
    order_data JSONB NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pago_movil', 'binance', 'saldo')),
    payment_reference TEXT, -- NULL si se paga con saldo
    payment_proof_url TEXT, -- NULL si se paga con saldo
    amount_paid NUMERIC NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('BS', 'USDT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla: Depósitos de Saldo (Para recargar la billetera)
CREATE TABLE public.deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount_usdt NUMERIC NOT NULL CHECK (amount_usdt >= 2), -- Mínimo 2 USDT
    amount_paid NUMERIC NOT NULL, -- Cuánto transfirió realmente
    currency TEXT NOT NULL CHECK (currency IN ('BS', 'USDT')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pago_movil', 'binance')),
    payment_reference TEXT NOT NULL,
    payment_proof_url TEXT NOT NULL,
    status deposit_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- 3. FUNCIONES AUTOMÁTICAS (TRIGGERS)

-- IMPORTANTE: Ya no creamos el perfil automáticamente con un trigger simple 
-- porque necesitamos que el Frontend nos envíe el Nombre y el WhatsApp.
-- El frontend hará el INSERT manual en `profiles` después de registrar al usuario.

-- Función para limpiar datos sensibles (contraseñas) de la orden cuando se completa
CREATE OR REPLACE FUNCTION public.clean_sensitive_order_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    IF NEW.order_data ? 'password' THEN
      NEW.order_data = jsonb_set(NEW.order_data, '{password}', '"[ELIMINADO_POR_SEGURIDAD]"');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clean_data_on_complete
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.clean_sensitive_order_data();


-- 4. REGLAS DE SEGURIDAD (Row Level Security - RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Función segura para verificar si un usuario es admin sin causar recursión infinita
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role public.user_role;
BEGIN
  -- Se usa SECURITY DEFINER para que Postgres no aplique RLS a esta consulta interna
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role = 'admin'::public.user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Profiles
CREATE POLICY "Cualquiera puede crear su perfil al registrarse" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuarios leen su perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuarios pueden actualizar su propio perfil (nombre)" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins gestionan todos los perfiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Products
CREATE POLICY "Todo el mundo lee productos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins gestionan productos" ON public.products FOR ALL USING (public.is_admin());

-- Settings
CREATE POLICY "Todo el mundo lee configuraciones" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admins gestionan configuraciones" ON public.settings FOR ALL USING (public.is_admin());

-- Orders
CREATE POLICY "Clientes crean órdenes" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clientes leen sus órdenes" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins gestionan todas las órdenes" ON public.orders FOR ALL USING (public.is_admin());

-- Deposits
CREATE POLICY "Clientes crean depósitos" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clientes leen sus depósitos" ON public.deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins gestionan todos los depósitos" ON public.deposits FOR ALL USING (public.is_admin());

-- 5. STORAGE (Almacenamiento para Captures de Pago)
INSERT INTO storage.buckets (id, name, public) VALUES ('payment_proofs', 'payment_proofs', true) ON CONFLICT DO NOTHING;
-- Nota: Hice el bucket public=true para que el link generado sea accesible directamente para el Admin.

-- Limpiar políticas viejas del Storage
DROP POLICY IF EXISTS "Clientes pueden subir captures" ON storage.objects;
DROP POLICY IF EXISTS "Cualquiera puede ver captures" ON storage.objects;
DROP POLICY IF EXISTS "Admins pueden ver captures" ON storage.objects;
DROP POLICY IF EXISTS "Clientes pueden ver sus propios captures" ON storage.objects;

CREATE POLICY "Clientes pueden subir captures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment_proofs' AND auth.uid() = owner);
CREATE POLICY "Cualquiera puede ver captures" ON storage.objects FOR SELECT USING (bucket_id = 'payment_proofs');
