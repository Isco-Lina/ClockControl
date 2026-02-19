# ClockControl

App de control de asistencia con registro de entrada/salida y generación de reportes. Construida con React, Firebase y Vite.

## Tecnologías

- **React 19** — UI
- **Firebase** — Autenticación (Email/Password) y base de datos (Firestore)
- **xlsx** — Exportación a Excel
- **jsPDF + jspdf-autotable** — Exportación a PDF
- **Bootstrap 5** — Estilos (via CDN)
- **Bootstrap Icons** — Iconografía (paquete npm `bootstrap-icons`)
- **vite-plugin-pwa** — Soporte PWA (instalable como app nativa)

## Instalación

```bash
npm install
npm run dev
```

## Configuración de Firebase

Crea un archivo `.env` en la raíz del proyecto con las credenciales de tu proyecto de Firebase Console:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> El archivo `.env` está en `.gitignore` y nunca se sube al repositorio.

Asegúrate de tener habilitados en Firebase:

- **Authentication** → Email/Password
- **Firestore Database** con la siguiente regla mínima:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Perfil del usuario
    match /users/{uid} {
      allow read, write: if request.auth != null
        && request.auth.uid == uid;
    }

    // Registros de asistencia
    match /time_logs/{docId} {

      // Leer solo si el registro pertenece al usuario
      allow read: if request.auth != null
        && resource.data.uid == request.auth.uid;

      // Crear solo si el uid del registro coincide con el usuario autenticado
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid;

      // Actualizar o borrar solo si le pertenece
      allow update, delete: if request.auth != null
        && resource.data.uid == request.auth.uid;
    }
  }
}
```

## Estructura

```
src/
├── firebase/
│   └── firebase.js        # Configuración de Firebase
├── components/
│   ├── Login.jsx          # Inicio de sesión
│   ├── TimeClock.jsx      # Registro de entrada/salida
│   └── Report.jsx         # Reporte por rango de fechas
└── App.jsx                # Enrutamiento por estado de autenticación
```

## Funcionalidades

- **Registro de cuenta** — desde la pantalla de login el usuario puede alternar al modo "Crear cuenta" ingresando email y contraseña; al registrarse se crea automáticamente un perfil en la colección `users` de Firestore
- **Login / Logout** — autenticación con email y contraseña; el botón de cierre de sesión (icono `bi-box-arrow-right`) está disponible en la cabecera del panel principal
- **Marcar Entrada / Salida** con timestamp en tiempo real
- **Reporte** filtrable por rango de fechas con cálculo de horas trabajadas
  - Descuenta automáticamente **30 minutos de colación** en días lunes a sábado
  - Muestra horas brutas, deducción y horas netas por día
- **Exportar** reporte a Excel o PDF (incluye columna de colación)
- **PWA instalable** — se puede añadir a la pantalla de inicio en Android, iOS y escritorio

## Despliegue en Netlify

El proyecto está listo para desplegarse en Netlify:

| Setting           | Valor           |
| ----------------- | --------------- |
| Build command     | `npm run build` |
| Publish directory | `dist`          |

El archivo `public/_redirects` ya está incluido para que las rutas del cliente funcionen correctamente.

Una vez desplegado bajo HTTPS, la app será instalable como PWA desde el navegador.
