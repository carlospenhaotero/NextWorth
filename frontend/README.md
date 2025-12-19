# NextWorth Frontend

Frontend de NextWorth - Plataforma de gestión de portafolios con React.

## Características

- ✅ Registro de usuarios
- ✅ Inicio de sesión
- ✅ Visualización del portfolio
- ✅ Añadir activos al portfolio
- ✅ Cambio de moneda base (USD/EUR)
- ✅ Diseño moderno y responsive

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Construcción

```bash
npm run build
```

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/      # Componentes reutilizables
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Layout.jsx
│   │   └── ProtectedRoute.jsx
│   ├── pages/           # Páginas principales
│   │   ├── Dashboard.jsx
│   │   └── AddAsset.jsx
│   ├── context/         # Context API
│   │   └── AuthContext.jsx
│   ├── services/        # Servicios API
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── portfolioService.js
│   │   └── userService.js
│   ├── styles/          # Estilos CSS
│   │   ├── global.css
│   │   ├── auth.css
│   │   ├── layout.css
│   │   ├── dashboard.css
│   │   └── addAsset.css
│   ├── App.jsx          # Componente principal
│   └── main.jsx         # Punto de entrada
├── index.html
├── package.json
└── vite.config.js
```

## Configuración

El frontend se conecta al backend en `http://localhost:4000` por defecto. Puedes cambiar esto creando un archivo `.env`:

```
VITE_API_URL=http://localhost:4000/api
```

## Tecnologías

- React 18
- React Router 6
- Axios
- Vite



