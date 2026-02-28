# Frontend - Mi Tienda Online

Frontend SPA construido con React + Webpack para autenticación, dashboard de métricas y gestión de productos, clientes y ventas.

## 1. Estructura básica del frontend

```text
frontend/
  src/
    App.js                      # enrutamiento principal y estado de sesión
    index.js                    # punto de entrada React
    login.js                    # pantalla/formulario de login
    dashboard.js                # layout principal del dashboard
    styles.css                  # estilos globales
    services/
      api.js                    # cliente HTTP (Axios) para backend
    components/
      ProtectedRoute.js         # protección de rutas privadas
      DashboardHeader.js        # encabezado y menú de usuario
      DashboardSidebar.js       # navegación lateral
      DashboardOverview.js      # panel principal de métricas
      SalesSummary.js           # resumen de KPIs
      SectionContent.js         # render dinámico por sección
      ProductsSection.js        # CRUD de productos
      ProductForm.js            # formulario de producto
      CustomersSection.js       # CRUD de clientes
      SalesSection.js           # CRUD de ventas
      SalesForm.js              # formulario de venta
      Settings.js               # configuración de usuario
      Charts.js                 # visualizaciones con Recharts
    pages/                      # páginas auxiliares
    config/                     # configuración de rutas y app
    hooks/                      # hooks personalizados
    features/                   # módulos por funcionalidad
    __tests__/                  # pruebas con Jest + RTL
    setupTests.js               # setup de pruebas
  public/
    index.html
  webpack.config.js             # configuración de build/dev server
  jest.config.js                # configuración de testing
  sample.env                    # variables de entorno de ejemplo
  package.json
  README.md
```

## 2. Explicación simple del flujo

- Router decide qué vista se muestra según la URL.
- App administra autenticación en memoria + localStorage.
- Componentes renderizan interfaz y capturan interacción del usuario.
- Service API llama al backend y retorna datos para pintar estado en UI.

Flujo resumido:
- Usuario inicia sesión en login.
- App guarda user/token y habilita rutas protegidas.
- Dashboard carga métricas y secciones (productos/clientes/ventas/configuración).
- Cada sección consume endpoints backend para operaciones CRUD.

## 3. Rutas y módulos principales del frontend

### 3.1 Rutas de autenticación y acceso

- `/login` → login de usuario.
- `/` → redirección a dashboard o login según sesión.

### 3.2 Rutas de secciones del dashboard (protegidas)

- `/sales`
- `/products`
- `/customers`
- `/settings`
- `/dashboard` (vista general)

### 3.3 Módulos funcionales clave

- Autenticación: login, logout, control de sesión.
- Dashboard: métricas generales, gráficos y resumen comercial.
- Gestión de productos: crear, listar, editar, eliminar.
- Gestión de clientes: crear, listar, editar, eliminar.
- Gestión de ventas: crear, listar, actualizar, anular.

## 4. Ejemplos prácticos del frontend

### Ejemplo 1 — Login exitoso

Acción del usuario:
- Ingresa usuario y contraseña en la pantalla de login.

Comportamiento esperado:
- Se llama a `authService.login`.
- Se guarda `user` y `token` en localStorage.
- El router redirige a una ruta protegida del dashboard.

Explicación:
- Si credenciales son válidas, la sesión queda activa y el usuario accede a módulos internos.

---

### Ejemplo 2 — Navegar entre secciones del dashboard

Acción del usuario:
- Hace clic en “Ventas”, “Productos” o “Clientes” en el sidebar.

Comportamiento esperado:
- Se actualiza la URL (`/sales`, `/products`, `/customers`).
- Se renderiza el componente de sección correspondiente.

Explicación:
- La navegación está conectada al estado `activeSection` y al router, manteniendo sincronía URL/UI.

---

### Ejemplo 3 — Crear un producto desde UI

Acción del usuario:
- En Productos, abre “Nuevo Producto” y envía el formulario.

Comportamiento esperado:
- Se llama al endpoint de creación en backend vía `dashboardService.createProduct`.
- La tabla se refresca y se muestra el nuevo registro.

Explicación:
- El formulario valida datos y la vista actualiza estado para reflejar cambios sin recargar la página.

## 5. Ejecución rápida

```bash
cd frontend
npm install
npm start
```

Aplicación por defecto: http://localhost:3000

## 6. Variables de entorno

Usa `sample.env` como base:

```env
API_BASE_URL=http://localhost:4000
```

- `API_BASE_URL`: URL base del backend para llamadas HTTP.

## 7. Testing

```bash
npm run test
npm run test:watch
npm run test:ci
```

Incluye pruebas de componentes, flujos de autenticación, secciones CRUD y cobertura de UI.
