Proyecto: ing-de-software-2 - App Choferes Logística

1. Descripción general
   - Aplicación móvil híbrida para choferes de logística con trazabilidad (captura de fotos, geolocalización, gestión de entregas)
   - Frontend React (web) para panel administrativo / monitoreo de alertas y rutas.
   - App móvil Expo React Native (carpeta app-choferes-logistica) para operativa en campo.
   - Backend BaaS en Supabase (PostgreSQL + Auth + Storage).

2. Stack principal
   - JavaScript (ES6+), TypeScript en módulo móvil
   - Expo SDK (React Native)
   - React en web, hooks personalizados
   - Supabase para base datos, autenticación, archivos
   - Node.js con npm para dependencias
   

3. Estructura de archivos (resumen)
   - / (raíz): componentes React web sueltos (AlertCard.jsx, AlertQueue.jsx, App.js, MapView.jsx...) + config Docker + supabaseClient.js
   - /public: index.html
   - /src: App.js + index.js + components UI (Alert*, AsignacionRutas, LoginPage, etc.) + hooks (useAlerts, useAuth) + lib (rutasService, supabaseClient)
   - /app-choferes-logistica: app Expo completo
      * app.json, package.json, tsconfig, ESLint
      * src/components (BotonCerrarDespacho, ValidacionEntregaQR)
      * src/services (cierreDespachoService, emailService, entregasService, pdfService)
      * src/lib/supabaseClient.ts
      * scripts/RegistroViaje.js, reset-project.js
      * rutas en app/(tabs, explore)

4. Funcionalidades clave
   - Autenticación y sesión con Supabase
   - Sincronización de entrega y evidencia multimedia
   - Geolocalización en tiempo real (Expo Location)
   - Gestor de alertas y asignación de rutas (panel administrativo)
   - Monitoreo de licencias
   - Exportar/mostrar PDF y emails de despacho

5. Cómo ejecutar (adaptado)
   a) Web (panel administrativo):
      - Abrir terminal en la raíz del proyecto.
      - Ejecutar: npm install
      - Esperar a que se instalen dependencias.
      - Ejecutar: npm start
      - Abrir navegador en: http://localhost:3000 (o puerto que muestre
        la terminal).
      

   b) Móvil (app-choferes-logistica):
      - cd app-choferes-logistica
      - npm install
      - Crear archivo .env (en la misma carpeta) con 4 líneas:
          EXPO_PUBLIC_SUPABASE_URL=<tu_url_supabase>
          EXPO_PUBLIC_SUPABASE_ANON_KEY=<tu_key_anon_supabase>
          EXPO_PUBLIC_RESEND_API_KEY=<tu_api_key_resend>
          EXPO_PUBLIC_RESEND_FROM_EMAIL=<onboarding@resend.dev>

      - Ejecutar: npx expo start -c
     
      - En Expo Go en tu celular:
          * En android desde la app expo escanear el QR de la terminal
          * En ios desde la camara escanear el QR de la terminal
          * Confirmar que la app se conecta a Supabase y muestra pantalla de login.
      - Probar: iniciar sesión, capturar evidencia, terminar despacho y sincronzar.

