-- ===============================================
-- SCRIPT PARA INSERTAR PRODUCTOS V2 (PRECIOS POR RANGOS)
-- ===============================================
-- NOTA: Como no me diste los precios exactos para cada rango, puse el 
-- precio 'Cliente' según tu lista original (dividido entre 800) y agregué 
-- pequeños descuentos automáticos para Especial, Revendedor y Proveedor 
-- a modo de ejemplo. ¡Puedes cambiarlos antes de correr este script!

INSERT INTO public.products (name, category, price_usdt_proveedor, price_usdt_cliente, price_usdt_especial, price_usdt_revendedor, required_fields)
VALUES
  -- ==========================================
  -- CATEGORÍA: FREE FIRE
  -- ==========================================
  -- Recargas de Diamantes
  ('100+10 Diamantes', 'free_fire', 0.70, 1.00, 0.95, 0.85, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('200+20 Diamantes', 'free_fire', 1.50, 2.00, 1.90, 1.75, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('310+31 Diamantes', 'free_fire', 2.20, 2.94, 2.80, 2.60, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('520+52 Diamantes', 'free_fire', 3.80, 5.00, 4.75, 4.50, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('1,060+106 Diamantes', 'free_fire', 7.50, 9.38, 8.90, 8.40, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('2,180+218 Diamantes', 'free_fire', 14.80, 18.50, 17.50, 16.50, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('5,600+560 Diamantes', 'free_fire', 35.00, 43.13, 40.50, 38.00, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('11,200+1,120 Diamantes', 'free_fire', 70.00, 86.25, 81.00, 76.00, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),

  -- Pases y Tarjetas
  ('Pase Booyah', 'free_fire', 3.60, 4.50, 4.25, 4.00, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Tarjeta Básica (80 💎)', 'free_fire', 0.60, 0.78, 0.75, 0.70, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Tarjeta Semanal (340 💎)', 'free_fire', 2.20, 2.75, 2.60, 2.45, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Tarjeta Mensual (1.800 💎)', 'free_fire', 11.00, 13.75, 13.00, 12.25, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),

  -- Paquetes de Pase de Nivel
  ('Pase de Nivel 6 (120 💎)', 'free_fire', 0.70, 0.88, 0.83, 0.78, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Pase de Nivel 10 (200 💎)', 'free_fire', 0.95, 1.19, 1.13, 1.05, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Pase de Nivel 15 (200 💎)', 'free_fire', 0.95, 1.19, 1.13, 1.05, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Pase de Nivel 20 (200 💎)', 'free_fire', 0.95, 1.19, 1.13, 1.05, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Pase de Nivel 25 (200 💎)', 'free_fire', 0.95, 1.19, 1.13, 1.05, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Pase de Nivel 30 (350 💎)', 'free_fire', 1.50, 1.88, 1.78, 1.68, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),


  -- ==========================================
  -- CATEGORÍA: BLOOD STRIKE
  -- ==========================================
  -- Recargas de Oro
  ('100 + 5 GOLD', 'blood_strike', 0.68, 0.85, 0.80, 0.75, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('300 + 20 GOLD', 'blood_strike', 2.05, 2.56, 2.45, 2.25, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('500 + 40 GOLD', 'blood_strike', 3.40, 4.27, 4.05, 3.80, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('1,000 + 100 GOLD', 'blood_strike', 6.80, 8.53, 8.10, 7.60, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('2,000 + 260 GOLD', 'blood_strike', 13.70, 17.13, 16.25, 15.25, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('5,000 + 800 GOLD', 'blood_strike', 37.00, 46.25, 43.90, 41.50, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),

  -- Pases Strike
  ('Élite Strike Pass', 'blood_strike', 3.20, 4.00, 3.80, 3.55, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Premium Strike Pass', 'blood_strike', 7.20, 9.08, 8.60, 8.00, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),


  -- ==========================================
  -- CATEGORÍA: STREAMING
  -- ==========================================
  ('Perfil de Netflix', 'streaming', 4.00, 5.00, 4.75, 4.50, '[{"name": "whatsapp", "label": "Tu WhatsApp para entregarte la cuenta", "type": "text", "placeholder": "Ej: +584120000000"}]'::jsonb),
  ('Netflix Cuenta Completa', 'streaming', 8.00, 10.00, 9.50, 9.00, '[{"name": "whatsapp", "label": "Tu WhatsApp para entregarte la cuenta", "type": "text", "placeholder": "Ej: +584120000000"}]'::jsonb);
