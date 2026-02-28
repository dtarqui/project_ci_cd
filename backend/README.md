# Backend - Mi Tienda Online

Backend REST construido con Node.js + Express para autenticación, dashboard y operaciones CRUD de productos, clientes y ventas.

## 1. Estructura básica del backend

```text
backend/
  app.js                        # exports para testing e integración
  index.js                      # arranque del servidor
  src/
    index.js                    # factory de la app (middlewares + rutas)
    config/
      cors.js                   # configuración CORS
    middleware/
      auth.js                   # autenticación y manejo de errores
    routes/
      authRoutes.js             # endpoints de autenticación
      productRoutes.js          # endpoints CRUD de productos
      customerRoutes.js         # endpoints CRUD de clientes
      salesRoutes.js            # endpoints CRUD de ventas
      dashboardRoutes.js        # endpoint de métricas
    controllers/
      authController.js         # lógica de autenticación
      productController.js      # lógica de productos
      customerController.js     # lógica de clientes
      salesController.js        # lógica de ventas
      dashboardController.js    # lógica de dashboard
    repositories/
      userRepository.js         # acceso a usuarios (memory/database)
    db/
      mockData.js               # datos mock (incluye usuarios)
    utils/
      helpers.js                # utilidades comunes
      validators.js             # validaciones
  __tests__/                    # pruebas automáticas con Jest
  sample.env                    # variables de entorno de ejemplo
  package.json
  README.md
```

## 2. Explicación simple del flujo

- `Route` recibe la petición HTTP y la dirige al controlador correcto.
- `Controller` valida entrada y decide la operación a ejecutar.
- `Repository/DB` obtiene o guarda datos (hoy en memoria, preparado para BD real).
- `Middleware` protege rutas y centraliza errores.

En este proyecto, la parte de usuarios ya está desacoplada con repositorio para facilitar migración de memoria a base de datos.

## 3. Endpoints principales del backend

### 3.1 Autenticación

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### 3.2 Productos (protegido)

- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

### 3.3 Clientes (protegido)

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`

### 3.4 Ventas (protegido)

- `GET /api/sales`
- `POST /api/sales`
- `GET /api/sales/:id`
- `PUT /api/sales/:id`
- `PUT /api/sales/:id/cancel`

### 3.5 Dashboard y health check

- `GET /api/dashboard/data`
- `GET /health`

## 4. Ejemplos de endpoints (estilo práctico)

Documentación completa separada en:

- [ENDPOINTS_EJEMPLOS.md](ENDPOINTS_EJEMPLOS.md)

Incluye ejemplos prácticos de **todos los endpoints**:

## 5. Ejecución rápida

```bash
cd backend
npm install
npm start
```

Servidor por defecto: `http://localhost:4000`

## 6. Variables de entorno

Usa `sample.env` como base:

```env
PORT=4000
NODE_ENV=development
USER_REPOSITORY=memory
```

## 7. Testing

```bash
npm run test
npm run test:coverage
```

Incluye pruebas de API, middleware, CORS, CRUD y cobertura extendida.
