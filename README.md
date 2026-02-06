# 🛒 Mi Tienda - Demo CI/CD (Jenkins)

Aplicación web full-stack de ejemplo con autenticación y dashboard de métricas, enfocada en demostrar un pipeline CI/CD con Jenkins.

## 🎯 Estado Actual

✅ **Backend:** 112/112 tests pasando  
✅ **Frontend:** 73/76 tests pasando  
✅ **CRUD Completo:** POST, GET, PUT, DELETE funcionando  
✅ **Arquitectura Limpia:** Middleware, utilities y routes organizados  

## 📋 Características

- ✅ **Autenticación completa** - Login/logout con validación
- 📊 **Dashboard interactivo** - Métricas de ventas con gráficos
- 📦 **CRUD de Productos** - Crear, leer, actualizar, eliminar (recientemente reparado)
- 🎨 **Diseño moderno** - UI responsive basada en mockups
- 🧪 **Testing completo** - Tests unitarios con Jest y React Testing Library (112 tests backend)
- 🔧 **Backend robusto** - API REST con Express.js
- 🚀 **CI/CD automatizado** - Pipeline con Jenkins (lint, tests, build, deploy)
- 📦 **Docker ready** - Backend containerizado

## 🏗️ Arquitectura

```
├── frontend/          # React 18 + Webpack
│   ├── src/
│   │   ├── App.js                    # Componente principal
│   │   ├── login.js                  # Formulario de autenticación
│   │   ├── dashboard.js              # Panel de métricas
│   │   ├── styles.css                # Estilos CSS modernos
│   │   ├── services/
│   │   │   └── api.js                # Cliente API (GET, POST, PUT, DELETE)
│   │   └── components/
│   │       ├── ProductsSection.js    # Tabla CRUD de productos
│   │       ├── ProductForm.js        # Modal para crear/editar
│   │       └── ...otros componentes
│   └── __tests__/                    # Tests unitarios (76 tests)
├── backend/           # Node.js + Express
│   ├── app.js              # 620 líneas - Limpia y modular
│   │   ├─ Middleware (autenticación)
│   │   ├─ Utility Functions (helpers)
│   │   ├─ Product Routes (CRUD)
│   │   ├─ Auth Routes
│   │   └─ Error Handling
│   ├── index.js            # Servidor API
│   ├── Dockerfile          # Configuración Docker
│   └── __tests__/          # Tests unitarios (112 tests)
├── docs/
│   ├── ARCHITECTURE_GUIDE.md      # Guía detallada de arquitectura
│   ├── FRONTEND_INTEGRATION.md    # Cómo usar los endpoints
│   └── REFACTOR_SUMMARY.md        # Resumen de cambios
└── Jenkinsfile                    # Pipeline CI/CD
```

## 🚀 Instalación Rápida

### Prerrequisitos
- Node.js 18+
- npm o yarn

### 1. Backend
```bash
cd backend
npm install
npm start
# Servidor en http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
npm install
npm start
# App en http://localhost:3000
```
# Aplicación en http://localhost:3000
```

## 👤 Usuarios de Prueba

| Usuario | Contraseña | Descripción |
|---------|------------|-------------|
| `admin` | `admin123` | Administrador |
| `demo`  | `demo123`  | Usuario demo |
| `test`  | `test123`  | Usuario test |

## � API Endpoints - CRUD de Productos

### Crear Producto (POST)
```bash
POST /api/products
Authorization: Bearer valid_token
Content-Type: application/json

{
  "name": "Laptop Dell XPS",
  "category": "Electrónica",
  "price": 999.99,
  "stock": 45
}
# Respuesta: 201 Created
```

### Listar Productos (GET)
```bash
GET /api/products?search=&category=Electrónica&sort=price
Authorization: Bearer valid_token

# Respuesta: 200 OK
# {
#   "success": true,
#   "data": [ { id, name, category, price, stock, status, ... }, ... ],
#   "count": 10
# }
```

### Obtener Producto Individual (GET)
```bash
GET /api/products/1
Authorization: Bearer valid_token

# Respuesta: 200 OK
# { "success": true, "data": { id: 1, name: "...", ... } }
```

### Actualizar Producto (PUT)
```bash
PUT /api/products/1
Authorization: Bearer valid_token
Content-Type: application/json

{
  "price": 1199.99,
  "stock": 30
}
# Respuesta: 200 OK
# Status se actualiza automáticamente: "En Stock" / "Bajo Stock" / "Sin Stock"
```

### Eliminar Producto (DELETE)
```bash
DELETE /api/products/1
Authorization: Bearer valid_token

# Respuesta: 200 OK
# Producto eliminado de la base de datos
```

## 📊 Dashboard Features

El dashboard incluye:
- **Ventas diarias** - Métricas principales
- **Gráficos interactivos** - Ventas por sucursal, productos y tendencias
- **Gestión de Productos** - Crear, editar y eliminar productos
- **Búsqueda y Filtros** - Por nombre, categoría y ordenamiento
- **Responsive** - Adaptado a móviles y tablets

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend health check
cd backend
npm test
```

### Cobertura de Tests
- ✅ Componente Login - Autenticación, validación, estados
- ✅ Componente Dashboard - Navegación, datos, logout
- ✅ Servicios API - Mocking y manejo de errores
- ✅ Estados de carga - Loading states y error handling

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión

### Dashboard
- `GET /api/dashboard/data` - Datos de métricas

### Salud
- `GET /health` - Status del servidor

## 🎨 Diseño

La aplicación está basada en los mockups proporcionados:
- **Login page** - Formulario centrado con validación
- **Dashboard** - Layout con sidebar y gráficos
- **Responsive design** - Mobile-first approach
- **Paleta de colores** - Azul (#4F5BD8) como color principal

## 🚀 Deployment

### Docker
```bash
# Backend
cd backend
docker build -t mi-tienda-backend .
docker run -p 4000:4000 mi-tienda-backend

# Frontend
cd frontend
npm run build
# Servir build/ con tu servidor web favorito
```

### Jenkins
El pipeline principal está en [Jenkinsfile](Jenkinsfile) e incluye:
- ✅ Lint y tests (frontend/backend)
- ✅ Build frontend
- ✅ Validación de backend (health check)
- ✅ Deploy frontend a Vercel
- ✅ Docker build/push del backend (si el daemon está disponible)
- ✅ Reportes JUnit/HTML y métricas

## 📁 Scripts Disponibles

### Frontend
- `npm start` - Desarrollo con hot reload
- `npm run build` - Build para producción
- `npm test` - Ejecutar tests
- `npm run lint` - Linting con ESLint

### Backend
- `npm start` - Iniciar servidor
- `npm run dev` - Desarrollo con nodemon
- `npm test` - Health check test

## 🔧 Configuración

### Variables de Entorno

#### Frontend
Usa [frontend/.env](frontend/.env) y [frontend/sample.env](frontend/sample.env):
```env
API_BASE_URL=http://localhost:4000
```

#### Backend
Usa [backend/.env](backend/.env) y [backend/sample.env](backend/sample.env):
```env
PORT=4000
NODE_ENV=development
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Roadmap (opcional)

- [ ] Sistema de roles y permisos
- [ ] Base de datos real (PostgreSQL/MongoDB)
- [ ] Despliegue backend en un host remoto

## 📄 Licencia

Este proyecto está bajo la licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Reconocimientos

- Diseño basado en mockups proporcionados
- Icons: [Unicode emojis](https://unicode.org/emoji/)
- Charts: [Recharts](https://recharts.org/)
- Testing: [React Testing Library](https://testing-library.com/)

---

⭐ **¡Dale una estrella al proyecto si te ha sido útil!**

📧 **Contacto**: Tu email aquí