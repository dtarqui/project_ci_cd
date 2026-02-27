# 🛒 Mi Tienda Online

Aplicación web full-stack de ejemplo con autenticación y dashboard de métricas, enfocada en demostrar un pipeline CI/CD con Jenkins.

## 📝 Descripción del Proyecto

**Mi Tienda Online** es una aplicación web full-stack orientada a la gestión comercial de una tienda.
Incluye autenticación de usuarios, dashboard con métricas y módulos CRUD para productos, clientes y ventas.
El proyecto está diseñado como una base práctica para aprender arquitectura modular, pruebas automatizadas y despliegue continuo con Jenkins.

## 🎯 Objetivos del Sistema

- Implementar una solución full-stack funcional con frontend en React y backend en Express.
- Proveer autenticación y autorización básica para proteger rutas de negocio.
- Gestionar operaciones CRUD completas de productos, clientes y ventas.
- Visualizar indicadores clave del negocio mediante un dashboard interactivo.
- Garantizar calidad mediante pruebas automáticas y cobertura de código.
- Demostrar un flujo CI/CD reproducible para entornos de desarrollo y despliegue.
 

## 📋 Características

- ✅ **Autenticación JWT** - Login/logout con validación de credenciales
- 📊 **Dashboard completo** - Métricas, gráficos interactivos con Recharts
- 📦 **CRUD Operations** - Gestión de Productos, Clientes y Ventas
- 🎨 **UI Responsive** - Diseño moderno con CSS, adaptable a dispositivos
- 🧪 **Testing exhaustivo** - 25 test files con Jest y React Testing Library
- 🔧 **API REST robusto** - 5 Controllers + 5 Routes en Express.js
- 🚀 **CI/CD completo** - Pipeline Jenkins: lint → test → build → deploy
- 📦 **Containerización** - Backend con Docker listo para producción
- 🔐 **Manejo de errores** - Middleware centralizado con validaciones

## 🏗️ Arquitectura General

```
project_ci_cd/
├── frontend/                     # React 18 + Webpack (puerto 3000)
│   ├── src/
│   │   ├── App.js               # Componente principal
│   │   ├── login.js             # Formulario de autenticación
│   │   ├── dashboard.js         # Panel de control principal
│   │   ├── index.js             # Entry point
│   │   ├── styles.css           # Estilos globales
│   │   ├── services/
│   │   │   └── api.js           # Cliente Axios (GET, POST, PUT, DELETE)
│   │   └── components/
│   │       ├── Charts.js                    # Gráficos interactivos
│   │       ├── DashboardHeader.js           # Encabezado del dashboard
│   │       ├── DashboardSidebar.js          # Menú de navegación
│   │       ├── DashboardOverview.js         # Resumen general
│   │       ├── ProductsSection.js           # Gestión de productos
│   │       ├── ProductForm.js               # Formulario producto
│   │       ├── CustomersSection.js          # Gestión de clientes
│   │       ├── SalesSection.js              # Gestión de ventas
│   │       ├── SalesForm.js                 # Formulario ventas
│   │       ├── SalesSummary.js              # Resumen ventas
│   │       ├── SectionContent.js            # Contenedor genérico
│   │       └── Settings.js                  # Configuración
│   ├── __tests__/                           # 15 test files
│   ├── public/
│   ├── jest.config.js
│   └── webpack.config.js
│
├── backend/                      # Node.js + Express (puerto 4000)
│   ├── app.js                   # Punto de entrada principal
│   ├── index.js                 # Servidor Express
│   ├── src/
│   │   ├── config/
│   │   │   └── cors.js          # Configuración CORS
│   │   ├── middleware/
│   │   │   └── auth.js          # Auth middleware y error handlers
│   │   ├── controllers/          # Lógica de negocio
│   │   │   ├── authController.js
│   │   │   ├── customerController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── productController.js
│   │   │   └── salesController.js
│   │   ├── routes/               # Definición de rutas
│   │   │   ├── authRoutes.js
│   │   │   ├── customerRoutes.js
│   │   │   ├── dashboardRoutes.js
│   │   │   ├── productRoutes.js
│   │   │   └── salesRoutes.js
│   │   ├── db/
│   │   │   └── mockData.js      # Datos mock y usuarios de prueba
│   │   ├── utils/
│   │   │   ├── helpers.js       # Funciones auxiliares
│   │   │   └── validators.js    # Validadores
│   │   └── index.js             # Factory de app Express
│   ├── __tests__/                # 10 test files
│   ├── coverage/                 # Reporte de cobertura
│   ├── Dockerfile
│   ├── jest.config.js
│   └── jest.setup.js
│
└── Jenkinsfile                   # Pipeline CI/CD (Jenkins)
```

## 🚀 Instrucciones para Ejecutar el Proyecto

### Prerrequisitos
- Node.js 18+
- npm

### 1. Clonar el repositorio
```bash
git clone https://github.com/dtarqui/project_ci_cd.git
cd project_ci_cd
```

### 2. Backend
```bash
cd backend
npm install
npm start
# Servidor en http://localhost:4000
```

### 3. Frontend (nueva terminal)
```bash
cd frontend
npm install
npm start
# App en http://localhost:3000 (se abre automáticamente)
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Ejecutar todos los tests
npm run test:watch         # Modo watch
npm run test:coverage      # Con reporte de cobertura
npm run test:ci            # Para CI/CD
```

**Test Files (10):**
- api.test.js
- auth.middleware.test.js
- cors.test.js
- coverage.test.js
- crud.test.js
- customer.crud.test.js
- index.test.js
- sales.crud.test.js
- unit.extended.test.js
- unit.test.js

### Frontend Tests
```bash
cd frontend
npm test                    # Ejecutar todos los tests
npm run test:watch         # Modo watch
npm run test:debug         # Modo debug
npm run test:ci            # Para CI/CD
```

**Test Files (15):**
- app.test.js
- charts.test.js
- customersSection.test.js
- dashboard.test.js
- dashboardHeader.test.js
- dashboardOverview.test.js
- dashboardSidebar.test.js
- login.test.js
- productForm.test.js
- productsSection.test.js
- salesForm.test.js
- salesSection.test.js
- salesSummary.test.js
- sectionContent.test.js
- settings.test.js

**Coverage Reports:**
- HTML reports en `backend/coverage/` y `frontend/coverage/`
- JUnit XML reports para Jenkins
- LCOV reports para análisis detallado

## 🔧 Project Structure & Commands

### Frontend Scripts
```bash
npm start                   # Desarrollo (puerto 3000)
npm run build              # Build para producción (genera dist/)
npm test                   # Ejecutar tests
npm run test:watch        # Watch mode para tests
npm run lint              # ESLint check
npm run lint:fix          # Auto-fix lint issues
```

### Backend Scripts
```bash
npm start                   # Producción (puerto 4000)
npm run dev                # Desarrollo con nodemon
npm test                   # Ejecutar tests
npm run test:watch        # Watch mode para tests
npm run test:coverage     # Con reporte de cobertura
npm run lint              # ESLint check
npm run lint:fix          # Auto-fix lint issues
```

## ⚙️ Configuration

### Frontend Environment Variables
Crea `frontend/.env` (basado en `frontend/sample.env`):
```env
API_BASE_URL=http://localhost:4000
```

### Backend Environment Variables
Crea `backend/.env` (basado en `backend/sample.env`):
```env
PORT=4000
NODE_ENV=development
```

## 🐳 Docker & Deployment

### Docker (Backend)
```bash
cd backend
docker build -t mi-tienda-backend:latest .
docker run -p 4000:4000 \
  -e PORT=4000 \
  -e NODE_ENV=production \
  mi-tienda-backend:latest
```

El Dockerfile está optimizado con:
- Multi-stage build
- Node.js 18+
- Exposición de puerto 4000

### Frontend Production Build
```bash
cd frontend
npm run build
# Genera carpeta dist/ lista para deployment
```

## 🚀 CI/CD Pipeline (Jenkins)

El [Jenkinsfile](Jenkinsfile) define un pipeline automático con las siguientes etapas:

### Pipeline Stages

1. **GitHub Checkout** - Clona el repo, captura commit info
2. **Environment Setup** - Valida Node.js 18+, limpia caché npm
3. **Frontend** - Instala deps → Lint → Tests → Build
4. **Backend** - Instala deps → Lint → Tests → Health check
5. **Build & Push** - Docker build, push a registry (opcional)
6. **Deploy** - Vercel deploy (opcional), reportes

### Features del Pipeline
- ✅ Poll SCM cada 5 minutos
- ✅ Reintentos automáticos (retry 2)
- ✅ Timeout de 20 minutos
- ✅ Reportes JUnit/HTML
- ✅ Coverage reports (LCOV)
- ✅ Notificaciones por email
- ✅ Build artifacts retention

### Triggers
```groovy
triggers {
    pollSCM('H/5 * * * *')  // Cada 5 minutos
}
```

## 🛠️ Stack Tecnológico Utilizado

**Frontend:**
- React 18.2 - UI Library
- Webpack 5 - Module bundler
- Babel 7 - JavaScript compiler
- Jest + React Testing Library - Testing
- Axios - HTTP client
- Recharts - Data visualization
- ESLint - Code linting

**Backend:**
- Node.js 18+ - Runtime
- Express 4.18 - Web framework
- Jest - Testing framework
- Supertest - HTTP assertions
- CORS - Cross-origin support
- dotenv - Environment config

**DevOps:**
- Docker - Containerization
- Jenkins - CI/CD automation
- JUnit/HTML Reports - Test reporting
- Vercel - Deploy platform (optional)


## 📄 License

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para detalles.
