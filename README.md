# ClockControl

App de control de asistencia con registro de entrada/salida y generación de reportes. Construida con React, Firebase y Vite.

## Tecnologías

- **React 19** — UI
- **Firebase** — Autenticación (Email/Password) y base de datos (Firestore)
- **xlsx** — Exportación a Excel
- **jsPDF + jspdf-autotable** — Exportación a PDF
- **Bootstrap 5** — Estilos (via CDN)
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
    match /time_logs/{doc} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null;
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

- **Login** con email y contraseña
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
