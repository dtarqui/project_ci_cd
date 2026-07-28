# Frontend - Mi Tienda Online

SPA en React + Webpack para autenticacion, dashboard y gestion de productos, clientes y ventas.

## Estructura actual

```text
frontend/
  src/
    App.js                     # Router + AuthProvider (envuelve toda la app)
    index.js
    login.js
    dashboard.js
    styles.css
    context/
      AuthContext.js            # AuthProvider + useAuth(): sesion, login/logout
    services/
      api.js                    # Unica puerta de entrada HTTP (axios + interceptores)
    hooks/
      useEntityList.js          # Carga/filtrado/orden compartido por listados CRUD
    utils/
      format.js                 # formatCurrency / formatDate
    components/
      Charts.js
      CustomerForm.js            # Formulario modal de clientes (mismo patron que ProductForm)
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
      ui/
        Badge.js                 # Pill de estado (usado por Products/Customers/Sales)
        Button.js
        EmptyState.js
        Modal.js
        Skeleton.js
        Spinner.js
    styles/
      *.css                     # Estilos especificos por seccion/formulario
    __tests__/
    setupTests.js
  public/
    index.html
  webpack.config.js
  jest.config.js
  sample.env
  package.json
```

Nota: no existe una carpeta `pages/` separada — el ruteo real vive en `App.js`
(rutas) y `dashboard.js` (seccion activa dentro del dashboard).

## Flujo principal
- `App.js` envuelve la app en `AuthProvider` (`context/AuthContext.js`), que hidrata la sesion desde `localStorage`, valida el token con `authService.getMe()` y expone `useAuth()` a cualquier componente (sin prop-drilling de `user`).
- Las rutas privadas usan `ProtectedRoute`.
- El dashboard sincroniza URL y seccion activa (`Dashboard`, `Ventas`, `Productos`, `Clientes`, `Configuraciones`).
- Las tres secciones CRUD (`ProductsSection`, `CustomersSection`, `SalesSection`) siguen el mismo patron: `useEntityList` para listar/filtrar/ordenar, un `*Form.js` modal para crear/editar, y `Badge` (via `components/ui/`) para mostrar el estado.
- Los servicios en `src/services/api.js` centralizan **todas** las llamadas HTTP (ningun componente llama a `axios`/`fetch` directamente) y el manejo de `401` (dispara el evento que `AuthContext` escucha para cerrar sesion).

## Rutas
- `/login` - inicio de sesion.
- `/register` - registro de usuario.
- `/dashboard` y `/dashboard/*` - dashboard protegido.
- `/:section` - acceso directo a secciones (`sales`, `products`, `customers`, `settings`).
- `/` - redireccion automatica a `/dashboard` o `/login`.

## Variables de entorno
Copia `sample.env` a `.env` y ajusta lo necesario — el comentario en ese archivo
indica que es **OPCIONAL**.

- `API_BASE_URL`: si no esta definida, en desarrollo se usa `http://localhost:4000`;
  en produccion se usan rutas relativas (`/`), pensado para rewrites de Vercel.

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

## Licencia
MIT, igual que el repositorio raiz — ver `../LICENSE`. Todas las dependencias
directas y de desarrollo (`react`, `react-router-dom`, `axios`, `recharts`,
`webpack`, `jest`, `@testing-library/*`, `eslint`, etc.) usan licencias
permisivas (MIT/Apache-2.0/BSD/ISC), compatibles con la licencia MIT de este
proyecto.
