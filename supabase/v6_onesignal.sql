-- ==========================================
-- VORTEX COINS V6: TRIGGERS PARA ONESIGNAL
-- ==========================================
-- Instrucciones:
-- Antes de ejecutar esto, necesitas tu REST API KEY de OneSignal.
-- Ve a OneSignal > Settings > Keys & IDs y copia la "REST API Key".
-- Reemplaza 'TU_REST_API_KEY_AQUI' en el código de abajo por tu llave real.

-- 1. Asegurar que la extensión pg_net (Peticiones asíncronas) está activa
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Crear la función que envía el Push a OneSignal
CREATE OR REPLACE FUNCTION public.send_onesignal_push()
RETURNS TRIGGER AS $$
DECLARE
  request_body JSONB;
BEGIN
  -- Construimos el JSON requerido por OneSignal
  request_body := jsonb_build_object(
    'app_id', '46ce36f2-ce43-4141-abfd-8e37e59bebac',
    'target_channel', 'push',
    'include_aliases', jsonb_build_object('external_id', jsonb_build_array(NEW.user_id)),
    'contents', jsonb_build_object('en', NEW.message, 'es', NEW.message),
    'headings', jsonb_build_object('en', 'Vortex Coins', 'es', 'Vortex Coins'),
    'url', 'https://vortex-coins.com' || NEW.link -- CAMBIA 'https://vortex-coins.com' por tu dominio real
  );

  -- Realizamos la petición HTTP POST a OneSignal de forma asíncrona
  PERFORM net.http_post(
      url:='https://api.onesignal.com/notifications?c=push',
      HEADERS:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Basic TU_API_KEY_AQUI'
      ),
      body:=request_body
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el Trigger en la tabla Notifications
-- Se ejecuta CADA VEZ que se inserta una nueva notificación interna
DROP TRIGGER IF EXISTS trigger_send_push ON public.notifications;
CREATE TRIGGER trigger_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE PROCEDURE public.send_onesignal_push();
