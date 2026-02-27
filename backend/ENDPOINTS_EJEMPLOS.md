# Endpoints del Backend

Este documento centraliza ejemplos prácticos de **todos** los endpoints del backend.

## Base URL

`http://localhost:4000`

## Autenticación

### 1) Login

**POST** `/api/auth/login`

Body (JSON):

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Resultado esperado:

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrador"
  },
  "token": "mock-jwt-token-1",
  "expiresIn": 3600
}
```

Explicación: valida credenciales y devuelve token + datos de usuario (sin password).

---

### 2) Logout

**POST** `/api/auth/logout`

Resultado esperado:

```json
{
  "success": true,
  "message": "Sesión cerrada correctamente",
  "timestamp": "2026-02-27T00:00:00.000Z"
}
```

Explicación: cierra sesión del lado del cliente (API responde confirmación).

---

### 3) Usuario actual

**GET** `/api/auth/me`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
```

Resultado esperado:

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

Explicación: valida token y retorna el usuario autenticado.

---

## Productos (requiere token)

### 4) Listar productos

**GET** `/api/products`

Query opcional:

- `search` (por nombre)
- `category` (categoría)
- `sort` (`name`, `price`, `stock`, `sales`)

Ejemplo:

`GET /api/products?search=laptop&category=Electrónica&sort=price`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
```

Resultado esperado: lista de productos filtrada y ordenada.

---

### 5) Obtener producto por ID

**GET** `/api/products/:id`

Ejemplo:

`GET /api/products/1`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
```

Resultado esperado: producto específico por ID.

---

### 6) Crear producto

**POST** `/api/products`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
Content-Type: application/json
```

Body (JSON):

```json
{
  "name": "Laptop Dell XPS",
  "category": "Electrónica",
  "price": 999.99,
  "stock": 45
}
```

Resultado esperado: producto creado con ID, estado y fecha.

---

### 7) Actualizar producto

**PUT** `/api/products/:id`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
Content-Type: application/json
```

Body (JSON):

```json
{
  "price": 949.99,
  "stock": 40
}
```

Resultado esperado: producto actualizado.

---

### 8) Eliminar producto

**DELETE** `/api/products/:id`

Ejemplo:

`DELETE /api/products/10`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
```

Resultado esperado: confirma eliminación y retorna el objeto eliminado.

---

## Clientes (requiere token)

### 9) Listar clientes

**GET** `/api/customers`

Query opcional:

- `search` (nombre, email o teléfono)
- `status` (`Activo`, `Inactivo`)
- `sort` (`name`, `email`, `spending`, `purchases`, `registered`)

Ejemplo:

`GET /api/customers?search=juan&status=Activo&sort=spending`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
```

Resultado esperado: arreglo de clientes filtrado.

---

### 10) Obtener cliente por ID

**GET** `/api/customers/:id`

Ejemplo:

`GET /api/customers/1`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
```

Resultado esperado: cliente específico por ID.

---

### 11) Crear cliente

**POST** `/api/customers`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
Content-Type: application/json
```

Body (JSON):

```json
{
  "name": "Carlos Pérez",
  "email": "carlos.perez@email.com",
  "phone": "+591 70000000",
  "address": "Av. Principal 123",
  "city": "La Paz",
  "postalCode": "LP-01"
}
```

Resultado esperado: cliente creado con `id`, `status`, `registeredDate` y métricas iniciales.

---

### 12) Actualizar cliente

**PUT** `/api/customers/:id`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
Content-Type: application/json
```

Body (JSON):

```json
{
  "phone": "+591 71111111",
  "city": "Cochabamba",
  "status": "Activo"
}
```

Resultado esperado: cliente actualizado.

---

### 13) Eliminar cliente

**DELETE** `/api/customers/:id`

Ejemplo:

`DELETE /api/customers/5`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
```

Resultado esperado: confirma eliminación y retorna cliente eliminado.

---

## Ventas (requiere token)

### 14) Listar ventas

**GET** `/api/sales`

Query opcional:

- `status` (`Completada`, `Pendiente`, `Anulada`)
- `customerId` (número)

Ejemplo:

`GET /api/sales?status=Pendiente&customerId=2`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
```

Resultado esperado: arreglo de ventas filtrado.

---

### 15) Obtener venta por ID

**GET** `/api/sales/:id`

Ejemplo:

`GET /api/sales/1`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
```

Resultado esperado: venta específica por ID.

---

### 16) Crear venta

**POST** `/api/sales`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
Content-Type: application/json
```

Body (JSON):

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

Resultado esperado: venta creada con cálculo de `subtotal`, `tax`, `total` y timestamps.

---

### 17) Actualizar venta

**PUT** `/api/sales/:id`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
Content-Type: application/json
```

Body (JSON):

```json
{
  "status": "Pendiente",
  "paymentMethod": "Transferencia",
  "notes": "Esperando confirmación"
}
```

Resultado esperado: venta actualizada.

---

### 18) Anular venta

**PUT** `/api/sales/:id/cancel`

Ejemplo:

`PUT /api/sales/2/cancel`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
```

Resultado esperado: venta con estado `Anulada`.

---

## Dashboard y Health

### 19) Datos del dashboard (requiere token)

**GET** `/api/dashboard/data`

Headers:

```http
Authorization: Bearer mock-jwt-token-1
```

Resultado esperado: métricas agregadas del dashboard (`dailySales`, `branchSales`, `salesTrend`, etc.) + `timestamp`.

---

### 20) Health check

**GET** `/health`

Resultado esperado:

```json
{
  "status": "ok",
  "timestamp": "2026-02-27T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

Explicación: confirma que el backend está activo.

---
