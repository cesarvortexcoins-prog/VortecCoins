-- ==========================================
-- VORTEX COINS V7: MÉTODOS DE PAGO DINÁMICOS
-- ==========================================
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase.

-- 1. Añadir la columna payment_info a la tabla settings
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS payment_info JSONB DEFAULT '
{
  "pago_movil": {
    "banco": "Mercantil (0105)",
    "telefono": "04228699277",
    "cedula": "32646297"
  },
  "binance": {
    "pay_id": "123456789",
    "email": "tu@correo.com"
  }
}'::jsonb NOT NULL;
