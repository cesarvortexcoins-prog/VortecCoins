-- ===============================================
-- SCRIPT PARA INSERTAR TODOS LOS PRODUCTOS EN EL CATÁLOGO
-- ===============================================

INSERT INTO public.products (name, category, price_bs, price_usdt, required_fields)
VALUES
  -- ==========================================
  -- CATEGORÍA: FREE FIRE
  -- ==========================================
  -- Recargas de Diamantes
  ('100+10 Diamantes', 'free_fire', 800.00, 1.00, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('200+20 Diamantes', 'free_fire', 1600.00, 2.00, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('310+31 Diamantes', 'free_fire', 2350.00, 2.94, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('520+52 Diamantes', 'free_fire', 4000.00, 5.00, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('1,060+106 Diamantes', 'free_fire', 7500.00, 9.38, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('2,180+218 Diamantes', 'free_fire', 14800.00, 18.50, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('5,600+560 Diamantes', 'free_fire', 34500.00, 43.13, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('11,200+1,120 Diamantes', 'free_fire', 69000.00, 86.25, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),

  -- Pases y Tarjetas
  ('Pase Booyah', 'free_fire', 3600.00, 4.50, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Tarjeta Básica (80 💎)', 'free_fire', 620.00, 0.78, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Tarjeta Semanal (340 💎)', 'free_fire', 2200.00, 2.75, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Tarjeta Mensual (1.800 💎)', 'free_fire', 11000.00, 13.75, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),

  -- Paquetes de Pase de Nivel
  ('Pase de Nivel 6 (120 💎)', 'free_fire', 700.00, 0.88, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Pase de Nivel 10 (200 💎)', 'free_fire', 950.00, 1.19, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Pase de Nivel 15 (200 💎)', 'free_fire', 950.00, 1.19, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Pase de Nivel 20 (200 💎)', 'free_fire', 950.00, 1.19, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Pase de Nivel 25 (200 💎)', 'free_fire', 950.00, 1.19, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Pase de Nivel 30 (350 💎)', 'free_fire', 1500.00, 1.88, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),


  -- ==========================================
  -- CATEGORÍA: BLOOD STRIKE
  -- ==========================================
  -- Recargas de Oro
  ('100 + 5 GOLD', 'blood_strike', 681.00, 0.85, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('300 + 20 GOLD', 'blood_strike', 2050.00, 2.56, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('500 + 40 GOLD', 'blood_strike', 3412.00, 4.27, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('1,000 + 100 GOLD', 'blood_strike', 6823.00, 8.53, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('2,000 + 260 GOLD', 'blood_strike', 13700.00, 17.13, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('5,000 + 800 GOLD', 'blood_strike', 37000.00, 46.25, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),

  -- Pases Strike
  ('Élite Strike Pass', 'blood_strike', 3200.00, 4.00, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),
  ('Premium Strike Pass', 'blood_strike', 7260.00, 9.08, '[{"name": "playerId", "label": "ID del Jugador", "type": "text", "placeholder": "Ej: 12345678"}]'::jsonb),


  -- ==========================================
  -- CATEGORÍA: STREAMING
  -- ==========================================
  ('Perfil de Netflix', 'streaming', 4000.00, 5.00, '[{"name": "whatsapp", "label": "Tu WhatsApp para entregarte la cuenta", "type": "text", "placeholder": "Ej: +584120000000"}]'::jsonb),
  ('Netflix Cuenta Completa', 'streaming', 8000.00, 10.00, '[{"name": "whatsapp", "label": "Tu WhatsApp para entregarte la cuenta", "type": "text", "placeholder": "Ej: +584120000000"}]'::jsonb)

ON CONFLICT DO NOTHING;
