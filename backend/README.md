# Backend - Mi Tienda Online

API REST en Node.js + Express para autenticacion JWT, dashboard y operaciones CRUD de productos, clientes, ventas y perfil de usuario.

## Estructura actual

```text
backend/
  app.js                 # Re-export de compatibilidad para tests (ver src/index.js)
  index.js               # Entrypoint del proceso: levanta el servidor HTTP
  api/
    index.js              # Adaptador serverless para despliegue en Vercel
  prisma/
    schema.prisma
    seed.js
    migrations/
  src/
    index.js              # Factory real de la app Express (createApp)
    config/
      constants.js         # Constantes de negocio (TAX_RATE, umbrales, tamaños de slice, etc.)
      cors.js               # Configuracion CORS (unica fuente de verdad)
    controllers/
      authController.js
      customerController.js
      dashboardController.js
      productController.js
      salesController.js
      userController.js
    services/
      dashboardService.js   # Logica de agregacion/analitica del dashboard
      salesService.js        # Validacion de stock, calculo de impuestos/descuento
    mappers/
      customerDao.js         # Normalizacion payload -> entidad (sin I/O)
      productDao.js
      saleDao.js
      userDao.js
    db/
      dataStore.js
      mockData.js
      prismaClient.js
    middleware/
      auth.js
    repositories/
      factory.js             # createRepository(): switch unico In-Memory/Database
      customerRepository.js
      dashboardRepository.js
      productRepository.js
      saleRepository.js
      userRepository.js
    routes/
      authRoutes.js
      customerRoutes.js
      dashboardRoutes.js
      productRoutes.js
      salesRoutes.js
      userRoutes.js
    utils/
      asyncHandler.js        # Envuelve handlers async y reenvia errores a next()
      helpers.js
      httpResponses.js       # sendSuccess/sendError (formato unico de respuesta)
      queryHelpers.js        # applySort() compartido por listados con filtro/orden
      validators.js
  __tests__/
  sample.env
  package.json
```

## Flujo
- Las rutas reciben peticiones HTTP y aplican middleware de autenticacion (y de rol, cuando corresponde).
- Los controladores validan datos de entrada, delegan la logica de negocio a `services/` cuando aplica (dashboard, ventas) y arman la respuesta HTTP con `sendSuccess`/`sendError`.
- `services/` contiene la logica de negocio pura (sin tocar `req`/`res`): agregaciones del dashboard y el calculo de stock/impuestos/descuento de una venta.
- `mappers/` normaliza el payload entrante hacia la forma de entidad persistida (sin acceso a datos).
- Los repositorios encapsulan acceso a datos: cada uno tiene una implementacion `InMemory*` (default, `mockData.js`) y una `Database*` (Postgres/Supabase via Prisma, `prisma/schema.prisma`), seleccionada por `repositories/factory.js` segun el switch unico `REPOSITORY_MODE`. Ver README raiz, seccion "Modo base de datos".
- El middleware centraliza errores, autenticacion, autorizacion por rol (`requireRole`) y respuestas 404, todo a traves de `sendError`.

## Roles
Cada usuario tiene `role`: `admin` o `vendedor` (default). `requireRole("admin")`
protege `DELETE /api/products/:id` y `DELETE /api/customers/:id`; el resto de
operaciones (lectura, creacion, actualizacion) estan disponibles para ambos roles.

## Endpoints

Autenticacion:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Perfil de usuario autenticado:
- `GET /api/users/me`
- `PUT /api/users/me`
- `DELETE /api/users/me`

Productos (protegido):
- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

Clientes (protegido):
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`

Ventas (protegido):
- `GET /api/sales`
- `POST /api/sales`
- `GET /api/sales/:id`
- `PUT /api/sales/:id`
- `PUT /api/sales/:id/cancel`

Dashboard y estado:
- `GET /api/dashboard/data` (protegido)
- `GET /health`

Ejemplos de uso en `ENDPOINTS_EJEMPLOS.md`.

## Ejecucion
```bash
cd backend
npm install
npm start
```

Servidor local: `http://localhost:4000`.

## Variables de entorno
Copia `sample.env` a `.env` y ajusta lo necesario — cada variable ahi indica si es
**OBLIGATORIA** u **OPCIONAL** (con su valor por defecto). Resumen rapido:

- `JWT_SECRET` es la unica variable estrictamente obligatoria, y solo en produccion
  (`NODE_ENV=production`): sin ella, o con menos de 32 caracteres, el servidor
  rechaza el arranque. En desarrollo tiene un fallback inseguro solo-local.
- `DATABASE_URL` es obligatoria unicamente cuando `REPOSITORY_MODE=database`.
- El resto (`PORT`, `NODE_ENV`, `REPOSITORY_MODE`, `CORS_*`, `JWT_EXPIRES_IN`,
  `JWT_ALGORITHM`, `JWT_ISSUER`, `JWT_AUDIENCE`) es opcional: cada una cae a un
  valor por defecto seguro para desarrollo si no se define.

## Scripts npm
- `npm start` - ejecutar API.
- `npm run dev` - ejecutar con nodemon.
- `npm test` - pruebas Jest.
- `npm run test:watch` - pruebas en modo watch.
- `npm run test:coverage` - cobertura local.
- `npm run test:ci` - pruebas CI con cobertura y reportes.
- `npm run lint` - lint del backend.
- `npm run lint:fix` - autofix lint.
- `npm run prisma:generate` - regenerar el cliente Prisma (tambien corre automaticamente en `postinstall`).
- `npm run prisma:migrate` - aplicar migraciones al `DATABASE_URL` configurado.
- `npm run db:seed` - poblar la BD con los mismos datos demo que el modo memoria.

## Notas
- Las respuestas exitosas de CRUD usan estructura tipo `{ success, data, message?, timestamp? }`.
- `/api/auth/me` valida token Bearer y devuelve `{ success, user }`.
- Para produccion, define un `JWT_SECRET` robusto (32+ caracteres).

## Licencia
MIT, igual que el repositorio raiz — ver `../LICENSE`. Todas las dependencias
directas y de desarrollo (`express`, `jsonwebtoken`, `@prisma/client`, `cors`,
`jest`, `eslint`, etc.) usan licencias permisivas (MIT/Apache-2.0/BSD/ISC),
compatibles con la licencia MIT de este proyecto.
