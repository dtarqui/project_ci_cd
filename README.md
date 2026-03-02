# Mi Tienda Online

## Descripción
Aplicación web full-stack para gestión comercial de una tienda, con autenticación, dashboard de métricas y módulos CRUD para productos, clientes y ventas. El proyecto está orientado a práctica de arquitectura modular, testing automatizado y pipeline CI/CD con Jenkins.

## Objetivo general
Analizar el uso de un pipeline CI/CD automatizado con Jenkins, aplicado al desarrollo de una aplicación web full-stack con Node.js y React, con el fin de evaluar su incidencia en la eficiencia operativa y la calidad del software en el contexto de PyMEs bolivianas, bajo un marco metodológico basado en SCRUM.

## Objetivos específicos
1. Se identificaron y analizaron métricas relacionadas con el nivel de automatización, la frecuencia de errores y los tiempos de despliegue durante el desarrollo de la aplicación web de ventas.
2. Se analizaron las principales barreras técnicas y organizacionales que influyen en la adopción de prácticas de Integración Continua y Entrega Continua (CI/CD) en PyMEs bolivianas del sector de desarrollo de software.
3. Se modeló un pipeline CI/CD acorde a las características del proyecto académico y a un contexto de recursos limitados, considerando herramientas accesibles y buenas prácticas DevOps.
4. Se describió y configuró un pipeline CI/CD a nivel de proyecto académico, orientado a la automatización de los procesos de construcción, pruebas y despliegue del software.
5. Se evaluó comparativamente el comportamiento de las métricas seleccionadas antes y después de la incorporación del pipeline CI/CD, para analizar su relación con la eficiencia operativa y la calidad del software.

## Alcance
### Incluye
- Frontend React con dashboard y vistas de gestión.
- Backend Express con rutas REST de autenticación, productos, clientes, ventas y dashboard.
- Pruebas unitarias/integración con Jest (backend y frontend).
- Pipeline Jenkins para validación automática (lint, test, build) y opciones de deploy.
- Containerización del backend con Docker.

### NO incluye
- Persistencia en base de datos real en producción (se usan datos mock para el flujo principal).
- Gestión avanzada de usuarios/roles.
- Infraestructura cloud productiva (deploy en Vercel/registry es opcional según entorno).

## Stack tecnológico
- **Frontend:** React 18, Webpack 5, Babel 7, Axios, Recharts, Jest, React Testing Library, ESLint.
- **Backend:** Node.js 18+, Express 4, Jest, Supertest, CORS, dotenv.
- **DevOps:** Jenkins, Docker, JUnit Reports, LCOV/HTML Coverage, Vercel (opcional).

## Arquitectura
- `frontend/`: SPA en React para autenticación, dashboard y módulos de gestión.
- `backend/`: API REST en Express con estructura por capas (`routes → controllers → repositories/db/utils`).
- Comunicación por HTTP entre frontend y backend usando `API_BASE_URL`.
- CI/CD centralizado en `Jenkinsfile` para automatizar validaciones y build.

## Endpoints core
1. `POST /api/auth/login` — Autenticación inicial.
2. `GET /api/auth/me` — Validación de sesión/token.
3. `GET /api/dashboard/data` — Métricas principales del dashboard.
4. `GET /api/products` — Listado de productos.
5. `POST /api/products` — Alta de producto.
6. `GET /api/customers` — Listado de clientes.
7. `GET /api/sales` — Listado de ventas.
8. `POST /api/sales` — Registro de venta.
9. `GET /health` — Estado del servicio backend.

## Cómo ejecutar el proyecto (local)
### 1) Clonar
```bash
git clone https://github.com/dtarqui/project_ci_cd.git
cd project_ci_cd
```

### 2) Backend
```bash
cd backend
npm install
npm start
# http://localhost:4000
```

### 3) Frontend (nueva terminal)
```bash
cd frontend
npm install
npm start
# http://localhost:3000
```

## Variables de entorno
### Frontend (`frontend/.env`, basado en `frontend/sample.env`)
```env
API_BASE_URL=http://localhost:4000
```

### Backend (`backend/.env`, basado en `backend/sample.env`)
```env
PORT=4000
NODE_ENV=development
```

## Otros
### Testing
- Backend: `npm test`, `npm run test:watch`, `npm run test:coverage`, `npm run test:ci`.
- Frontend: `npm test`, `npm run test:watch`, `npm run test:debug`, `npm run test:ci`.
- Reportes de cobertura en `backend/coverage/` y `frontend/coverage/`.

### Docker (backend)
```bash
cd backend
docker build -t mi-tienda-backend:latest .
docker run -p 4000:4000 -e PORT=4000 -e NODE_ENV=production mi-tienda-backend:latest
```

### CI/CD (Jenkins)
- Pipeline con etapas: checkout, setup, frontend, backend, build/push, deploy.
- Incluye `pollSCM`, reintentos, timeout, reportes de pruebas y cobertura.

### Estructura general del repositorio
- `frontend/`: aplicación cliente.
- `backend/`: API y lógica de negocio.
- `Jenkinsfile`: pipeline CI/CD.

### Licencia
Este proyecto está bajo licencia MIT. Ver `LICENSE` para más detalle.