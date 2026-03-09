# Endpoints del Backend

Esta guia resume ejemplos practicos de los endpoints activos del backend.

## Base URL local

`http://localhost:4000`

## Autenticacion

### POST `/api/auth/register`

Body:

```json
{
  "username": "nuevo.usuario",
  "password": "ClaveSegura123",
  "name": "Nuevo Usuario",
  "email": "nuevo@correo.com"
}
```

Respuesta esperada (`201`):

```json
{
  "success": true,
  "user": {
    "id": 4,
    "username": "nuevo.usuario",
    "name": "Nuevo Usuario",
    "email": "nuevo@correo.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "1h"
}
```

### POST `/api/auth/login`

Body:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Respuesta esperada (`200`):

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrador",
    "email": "admin@mitienda.local"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "1h"
}
```

### POST `/api/auth/logout`

Respuesta esperada (`200`):

```json
{
  "success": true,
  "message": "Sesion cerrada correctamente",
  "timestamp": "2026-03-09T12:00:00.000Z"
}
```

### GET `/api/auth/me`

Header:

```http
Authorization: Bearer <JWT_TOKEN>
```

Respuesta esperada (`200`):

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrador"
  }
}
```

## Perfil de usuario (protegido)

### GET `/api/users/me`

Header:

```http
Authorization: Bearer <JWT_TOKEN>
```

### PUT `/api/users/me`

Header:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

Body de ejemplo:

```json
{
  "name": "Admin Actualizado",
  "city": "La Paz",
  "phone": "+59170000000"
}
```

### DELETE `/api/users/me`

Header:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

Body:

```json
{
  "currentPassword": "admin123"
}
```

## Productos (protegido)

### GET `/api/products`

Query opcional:
- `search`
- `category`
- `sort` (`name`, `price`, `stock`, `sales`)

Ejemplo:

`GET /api/products?search=laptop&category=Electronica&sort=price`

### GET `/api/products/:id`

Ejemplo: `GET /api/products/1`

### POST `/api/products`

Body:

```json
{
  "name": "Laptop Dell XPS",
  "category": "Electronica",
  "price": 999.99,
  "stock": 45
}
```

### PUT `/api/products/:id`

Body:

```json
{
  "price": 949.99,
  "stock": 40
}
```

### DELETE `/api/products/:id`

Ejemplo: `DELETE /api/products/10`

## Clientes (protegido)

### GET `/api/customers`

Query opcional:
- `search`
- `status` (`Activo`, `Inactivo`)
- `sort` (`name`, `email`, `spending`, `purchases`, `registered`)

Ejemplo:

`GET /api/customers?search=juan&status=Activo&sort=spending`

### GET `/api/customers/:id`

Ejemplo: `GET /api/customers/1`

### POST `/api/customers`

Body:

```json
{
  "name": "Carlos Perez",
  "email": "carlos.perez@email.com",
  "phone": "+591 70000000",
  "address": "Av. Principal 123",
  "city": "La Paz",
  "postalCode": "LP-01"
}
```

### PUT `/api/customers/:id`

Body:

```json
{
  "phone": "+591 71111111",
  "city": "Cochabamba",
  "status": "Activo"
}
```

### DELETE `/api/customers/:id`

Ejemplo: `DELETE /api/customers/5`

## Ventas (protegido)

### GET `/api/sales`

Query opcional:
- `status` (`Completada`, `Pendiente`, `Anulada`)
- `customerId`

Ejemplo:

`GET /api/sales?status=Pendiente&customerId=2`

### GET `/api/sales/:id`

Ejemplo: `GET /api/sales/1`

### POST `/api/sales`

Body:

```json
{
  "customerId": 1,
  "items": [
    { "productId": 1, "quantity": 1 },
    { "productId": 2, "quantity": 2 }
  ],
  "discount": 20,
  "paymentMethod": "Tarjeta",
  "notes": "Entrega por la tarde",
  "status": "Completada"
}
```

### PUT `/api/sales/:id`

Body:

```json
{
  "status": "Pendiente",
  "paymentMethod": "Transferencia",
  "notes": "Esperando confirmacion"
}
```

### PUT `/api/sales/:id/cancel`

Ejemplo: `PUT /api/sales/2/cancel`

## Dashboard y health

### GET `/api/dashboard/data`

Header:

```http
Authorization: Bearer <JWT_TOKEN>
```

Respuesta esperada: metricas agregadas de dashboard (cards, series y distribuciones).

### GET `/health`

Respuesta esperada:

```json
{
  "status": "ok",
  "timestamp": "2026-03-09T12:00:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

## Formato de error comun

```json
{
  "error": "Mensaje de error",
  "code": "ERROR_CODE"
}
```

Errores frecuentes:
- `401` token faltante/invalido.
- `404` recurso no encontrado.
- `409` usuario o email ya registrado.
- `400` validacion de datos.
