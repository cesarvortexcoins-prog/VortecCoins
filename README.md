# Vortex Coins

Vortex Coins es una plataforma web dedicada a la recarga de monedas para videojuegos (como Free Fire y Blood Strike) y servicios de streaming, orientada principalmente al mercado de Venezuela. Permite a los usuarios realizar compras rápidas y seguras utilizando métodos de pago locales (Pago Móvil) y criptomonedas (USDT).

## Características Principales

- **Catálogo de Recargas:** Variedad de opciones para juegos y streaming.
- **Métodos de Pago:** Soporte integrado para Pago Móvil, Binance Pay (USDT) y saldo de billetera interna.
- **Billetera Digital:** Los usuarios pueden recargar saldo en la plataforma para realizar compras inmediatas.
- **Conversión de Monedas:** Selector global de moneda (Bolívares / USDT) que ajusta los precios dinámicamente.
- **Notificaciones Push:** Integración con OneSignal para mantener informados a los usuarios.
- **Seguridad:** Uso de Cloudflare Turnstile para protección contra bots.
- **Autenticación y Base de Datos:** Integración con Supabase para la gestión de usuarios, productos, transacciones y perfiles.
- **PWA (Progressive Web App):** Soporte para instalarse como aplicación en dispositivos móviles a través de `manifest.json`.

## Tecnologías Utilizadas

- **Frontend:** HTML5, Vanilla JavaScript, CSS3 (con fuentes de Google Fonts: Orbitron y Space Grotesk).
- **Backend as a Service (BaaS):** Supabase (Base de datos PostgreSQL, Autenticación).
- **Notificaciones:** OneSignal SDK.
- **Seguridad (Captcha):** Cloudflare Turnstile.
- **Gestor de Paquetes:** npm (usado para dependencias locales de desarrollo).

## Estructura del Proyecto

- `index.html`: Estructura principal de la aplicación, contiene todos los modales y el contenedor para la Single Page Application (SPA).
- `css/`: Directorio que contiene las hojas de estilo de la aplicación (`style.css`).
- `js/`: Directorio que contiene la lógica principal del frontend (`app.js`).
- `manifest.json` y `OneSignalSDKWorker.js`: Archivos para el funcionamiento de la PWA y Service Workers.
- `package.json` y `package-lock.json`: Definición de dependencias de Node.js (principalmente el SDK de Supabase).

## Configuración e Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/cesarvortexcoins-prog/VortecCoins.git
   ```

2. Instala las dependencias de Node.js (opcional para desarrollo):
   ```bash
   npm install
   ```

3. **Configuración de Supabase:**
   - La aplicación requiere credenciales de Supabase (URL y Clave Pública).
   - Estas variables deben ser configuradas en el archivo principal de JavaScript (`js/app.js`).

4. Inicia un servidor local para probar la aplicación. Puedes usar extensiones como "Live Server" de VSCode o `npx serve .`.

## Autor y Desarrollo

Plataforma desarrollada y diseñada por **Carlos La Rosa**.
Para soporte técnico o desarrollo de sistemas, contactar vía WhatsApp al +52 954 146 8345.
