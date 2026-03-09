# Frontend - Mi Tienda Online

SPA en React + Webpack para autenticacion, dashboard y gestion de productos, clientes y ventas.

## Estructura actual

```text
frontend/
  src/
    App.js
    index.js
    login.js
    dashboard.js
    styles.css
    services/
      api.js
    components/
      Charts.js
      CustomersSection.js
      DashboardHeader.js
      DashboardOverview.js
      DashboardSidebar.js
      ProductForm.js
      ProductsSection.js
      ProtectedRoute.js
      SalesForm.js
      SalesSection.js
      SalesSummary.js
      SectionContent.js
      Settings.js
    pages/
      CustomersPage.js
      DashboardPage.js
      NotFoundPage.js
      ProductsPage.js
      SalesPage.js
    config/
    hooks/
    features/
    __tests__/
    setupTests.js
  public/
    index.html
  webpack.config.js
  jest.config.js
  sample.env
  package.json
```

## Flujo principal
- `App.js` hidrata sesion desde `localStorage` y valida token con `authService.getMe()`.
- Las rutas privadas usan `ProtectedRoute`.
- El dashboard sincroniza URL y seccion activa (`Dashboard`, `Ventas`, `Productos`, `Clientes`, `Configuraciones`).
- Los servicios en `src/services/api.js` centralizan llamadas HTTP y manejo de `401`.

## Rutas
- `/login` - inicio de sesion.
- `/register` - registro de usuario.
- `/dashboard` y `/dashboard/*` - dashboard protegido.
- `/:section` - acceso directo a secciones (`sales`, `products`, `customers`, `settings`).
- `/` - redireccion automatica a `/dashboard` o `/login`.

## Variables de entorno
Base: `sample.env`.

```env
API_BASE_URL=http://localhost:4000
```

Notas:
- Si `API_BASE_URL` no esta definido, en desarrollo se usa `http://localhost:4000`.
- En produccion puede usar rutas relativas (`/`) dependiendo del despliegue.

## Ejecucion local
```bash
cd frontend
npm install
npm start
```

App local: `http://localhost:3000`.

## Scripts npm
- `npm start` - servidor de desarrollo con webpack-dev-server.
- `npm run build` - build de produccion.
- `npm test` - tests con coverage (runInBand).
- `npm run test:watch` - tests en modo watch.
- `npm run test:debug` - modo debug para diagnostico de tests.
- `npm run test:ci` - tests CI + coverage + reportes.
- `npm run lint` - lint de `src`.
- `npm run lint:fix` - autofix lint.

## Testing
Las pruebas cubren componentes, autenticacion, proteccion de rutas y secciones CRUD.

Reportes de cobertura:
- `frontend/coverage/lcov-report/index.html`
- `frontend/coverage/lcov.info`

## Integracion con backend
- Servicios disponibles: `authService`, `userService`, `dashboardService`.
- Endpoints consumidos: autenticacion, perfil (`/api/users/me`), dashboard y CRUD de productos/clientes/ventas.
- Ante `401`, el frontend limpia sesion y dispara evento `unauthorized` para forzar re-login.
