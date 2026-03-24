# ing-de-software-2 -  App Choferes Logística - HU-1 (Trazabilidad)
## Esta HU utiliza :
* **Frontend:** [React Native](https://reactnative.dev/) con el framework [Expo](https://expo.dev/) (SDK 54). Permite el desarrollo híbrido para iOS y Android con una sola base de código en JavaScript.
* **Lenguaje:** [JavaScript](https://developer.mozilla.org/es/docs/Web/JavaScript) (ES6+) con tipado y soporte de componentes funcionales (Hooks).
* **Backend (BaaS):** [Supabase](https://supabase.com/) (PostgreSQL). Gestiona la base de datos, el almacenamiento de archivos (Storage) y la autenticación.
* **Gestión de Archivos:** [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) para el manejo de imágenes en modo offline y conversión a Base64.
* **Geolocalización:** [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/) para la captura de coordenadas GPS en tiempo real.
* **Control de Versiones:** [Git](https://git-scm.com/) y [GitHub](https://github.com/benjita-unab/ing-de-software-2) para la colaboración y despliegue del código.



Esta versión incluye la funcionalidad completa de la Historia de Usuario 1 (HU-1): Captura de evidencia fotográfica offline, geolocalización nativa, interfaz responsive y sincronización en la nube con Supabase.

## Requisitos Previos
- Tener instalado [Node.js](https://nodejs.org/) en tu computadora.
- Tener instalada la aplicación **Expo Go** en tu celular (disponible gratis en App Store y Google Play).


---

##  Guía de Instalación y Ejecución

Sigue estos 4 pasos **estrictamente en orden** para correr la aplicación sin errores en tu entorno local:

### 1. Abrir la carpeta correcta
Es vital que abras tu terminal o tu editor de código (VS Code / Cursor) **directamente** en la carpeta del proyecto móvil.

cd app-choferes-logistica
 
### 2. Instalar las dependencias (Librerías)
Para descargar todas las herramientas de React Native y Expo, ejecuta:

npm install

## 3.Configurar las Llaves de Seguridad (.env)

1.Crea un archivo nuevo llamado exactamente .env.
## IMPORTANTE :
 Este archivo debe estar adentro de la carpeta app-choferes-logistica (al mismo nivel que package.json y app.json).
   
2.Solicita las credenciales oficiales por interno y pégalas dentro del archivo con este formato:
    EXPO_PUBLIC_SUPABASE_URL=pegar_url_aqui
    EXPO_PUBLIC_SUPABASE_ANON_KEY=pegar_key_aqui

## 4.Levantar el servidor:
Una vez instaladas las dependencias y creado el .env, levanta el servidor de Expo.Se recomienda usar el flag -c para limpiar el caché y obligar al sistema a leer las llaves nuevas ( (Nota: Si necesitas levantar la app para compañeros que no están conectados a tu misma red Wi-Fi, utiliza el comando npx expo start -c --tunnel).)

npx expo start -c

## 5.Probar en el celular:
Abre la cámara de tu celular (en iOS) o la app de Expo Go (en Android) y escanea el código QR que aparecerá en tu terminal. ¡La aplicación compilará y estará lista para usar!