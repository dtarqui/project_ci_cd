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
      validation.js             # Reglas de los formularios, compartidas por los tres
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
        Pagination.js            # Paginado compartido por las tres secciones CRUD
        Skeleton.js
        Spinner.js
        ui.css                   # Estilos de los componentes de esta carpeta
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
- Las tres secciones CRUD (`ProductsSection`, `CustomersSection`, `SalesSection`) siguen el mismo patron: `useEntityList` para listar/filtrar/ordenar, un `*Form.js` modal para crear/editar, `Badge` (via `components/ui/`) para mostrar el estado y `Pagination` para recorrer el listado.
- Los servicios en `src/services/api.js` centralizan **todas** las llamadas HTTP (ningun componente llama a `axios`/`fetch` directamente) y el manejo de `401` (dispara el evento que `AuthContext` escucha para cerrar sesion).

## Formularios

Los tres formularios (`CustomerForm`, `ProductForm`, `SalesForm`) comparten las reglas
de `utils/validation.js`, para que el criterio y el texto del error sean el mismo en
todos. Esas reglas replican las de `backend/src/utils/validators.js`: no se pueden
importar de ahí porque backend y frontend se compilan y despliegan por separado, así
que si cambia una regla hay que cambiar las dos. El formulario guía al usuario; quien
decide es la API.

Comportamiento común:
- El error aparece al **salir del campo**, no mientras se teclea; al escribir se limpia.
- Al enviar con errores, el foco va al primer campo inválido según el orden visual.
- El campo inválido lleva `aria-invalid` y `aria-describedby` apuntando a su mensaje.

Propio de cada uno:
- **`CustomerForm`** recibe `cities` (el catálogo de `GET /api/customers/cities`) y lo
  ofrece como lista; si llega vacío porque la petición falló, la ciudad vuelve a ser
  texto libre para no bloquear el alta. El prefijo del código postal lo pone la ciudad
  elegida y se muestra al lado del campo en vez de pedir que se teclee. El teléfono son
  ocho dígitos sin código de país, y un valor pegado con `+591` o con separadores se
  normaliza solo.
- **`ProductForm`** rechaza un stock decimal en lugar de truncarlo en silencio, que es
  lo que hacía antes al pasarlo por `parseInt`.
- **`SalesForm`** muestra el stock de cada producto y no deja enviar una cantidad que lo
  supere, ni el mismo producto en dos líneas, ni un descuento mayor que el total —antes
  el total se recortaba a 0 y la venta se guardaba regalando la diferencia. El banner de
  arriba resume y cada línea señala su propio problema. Desde el selector de cliente se
  puede crear uno nuevo sin abandonar la venta: el formulario de cliente se abre encima,
  y al guardar el cliente queda seleccionado con los productos ya cargados intactos.

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
- Servicios disponibles: `authService`, `userService`, `dashboardService`,
  `productService`, `customerService` y `saleService`, mas el helper `handleApiError`.
- Endpoints consumidos: autenticacion, perfil (`/api/users/me`), dashboard y CRUD de productos/clientes/ventas.
- Ante `401`, el frontend limpia sesion y dispara evento `unauthorized` para forzar re-login.

## Licencia
MIT, igual que el repositorio raiz — ver `../LICENSE`. Todas las dependencias
directas y de desarrollo (`react`, `react-router-dom`, `axios`, `recharts`,
`webpack`, `jest`, `@testing-library/*`, `eslint`, etc.) usan licencias
permisivas (MIT/Apache-2.0/BSD/ISC), compatibles con la licencia MIT de este
proyecto.
