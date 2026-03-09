# Backend - Mi Tienda Online

API REST en Node.js + Express para autenticacion JWT, dashboard y operaciones CRUD de productos, clientes, ventas y perfil de usuario.

## Estructura actual

```text
backend/
  app.js
  index.js
  src/
    index.js
    config/
      cors.js
    controllers/
      authController.js
      customerController.js
      dashboardController.js
      productController.js
      salesController.js
      userController.js
    dao/
      customerDao.js
      productDao.js
      saleDao.js
      userDao.js
    db/
      dataStore.js
      mockData.js
    middleware/
      auth.js
    repositories/
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
      helpers.js
      validators.js
  __tests__/
  sample.env
  package.json
```

## Flujo
- Las rutas reciben peticiones HTTP y aplican middleware de autenticacion cuando corresponde.
- Los controladores validan datos de entrada y arman respuestas.
- Los repositorios encapsulan acceso a datos (actualmente base en memoria/mock).
- El middleware centraliza errores, autenticacion y respuestas 404.

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
Base recomendada: `sample.env`.

```env
PORT=4000
NODE_ENV=development
USER_REPOSITORY=memory
DATA_REPOSITORY=memory
CORS_ALLOW_ORIGIN=*
CORS_ALLOW_METHODS=GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD
CORS_ALLOW_HEADERS=Origin, X-Requested-With, Content-Type, Accept, Authorization
JWT_SECRET=change-this-secret-in-production
JWT_EXPIRES_IN=1h
JWT_ALGORITHM=HS256
JWT_ISSUER=ci-cd-backend
JWT_AUDIENCE=ci-cd-frontend
```

## Scripts npm
- `npm start` - ejecutar API.
- `npm run dev` - ejecutar con nodemon.
- `npm test` - pruebas Jest.
- `npm run test:watch` - pruebas en modo watch.
- `npm run test:coverage` - cobertura local.
- `npm run test:ci` - pruebas CI con cobertura y reportes.
- `npm run lint` - lint del backend.
- `npm run lint:fix` - autofix lint.

## Notas
- Las respuestas exitosas de CRUD usan estructura tipo `{ success, data, message?, timestamp? }`.
- `/api/auth/me` valida token Bearer y devuelve `{ success, user }`.
- Para produccion, define un `JWT_SECRET` robusto (32+ caracteres).
