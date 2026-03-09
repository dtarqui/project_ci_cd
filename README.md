# Mi Tienda Online

Aplicacion web full-stack para gestion comercial de una tienda, con autenticacion JWT, dashboard de metricas y modulos CRUD para productos, clientes y ventas.

## Estado actual del proyecto
- Backend Express modular con rutas protegidas por token.
- Frontend React (Webpack) con login, registro y dashboard por secciones.
- Testing automatizado en frontend y backend con Jest + reportes de cobertura.
- Pipeline CI/CD en `Jenkinsfile` con lint, tests, build, despliegue opcional a Vercel y generacion de metricas de investigacion en `docs/metrics/`.

## Requisitos
- Node.js 18+
- npm 9+
- Docker (opcional, para backend)

## Ejecucion local
1. Clonar repositorio:

```bash
git clone https://github.com/dtarqui/project_ci_cd.git
cd project_ci_cd
```

2. Levantar backend (primero):

```bash
cd backend
npm install
npm start
```

Backend disponible en `http://localhost:4000`.

3. Levantar frontend (nueva terminal):

```bash
cd frontend
npm install
npm start
```

Frontend disponible en `http://localhost:3000`.

## Variables de entorno
Backend (`backend/.env`, base: `backend/sample.env`):

```env
PORT=4000
NODE_ENV=development
USER_REPOSITORY=memory
DATA_REPOSITORY=memory
CORS_ALLOW_ORIGIN=*
JWT_SECRET=change-this-secret-in-production
JWT_EXPIRES_IN=1h
JWT_ALGORITHM=HS256
JWT_ISSUER=ci-cd-backend
JWT_AUDIENCE=ci-cd-frontend
```

Frontend (`frontend/.env`, base: `frontend/sample.env`):

```env
API_BASE_URL=http://localhost:4000
```

Si `API_BASE_URL` no existe, el frontend usa `http://localhost:4000` en desarrollo.

## Scripts principales
Backend (`backend/package.json`):
- `npm start`
- `npm run dev`
- `npm test`
- `npm run test:watch`
- `npm run test:coverage`
- `npm run test:ci`
- `npm run lint`

Frontend (`frontend/package.json`):
- `npm start`
- `npm run build`
- `npm test`
- `npm run test:watch`
- `npm run test:debug`
- `npm run test:ci`
- `npm run lint`

## API y rutas clave
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users/me`
- `GET /api/dashboard/data`
- CRUD: `/api/products`, `/api/customers`, `/api/sales`
- `PUT /api/sales/:id/cancel`
- `GET /health`

Documentacion extendida de endpoints en `backend/ENDPOINTS_EJEMPLOS.md`.

## CI/CD (Jenkins)
El pipeline definido en `Jenkinsfile` incluye:
- Checkout desde GitHub (`main`).
- Instalacion de dependencias frontend/backend.
- Lint frontend y backend.
- Tests frontend y backend con publicacion JUnit + coverage HTML.
- Validacion basica del backend (`/health`).
- Build frontend (`webpack`).
- Deploy opcional a Vercel (backend y frontend).
- Archivado de artefactos.
- Generacion automatica de metricas y reportes en `docs/metrics/`.

## Estructura del repositorio
- `backend/`: API y logica de negocio.
- `frontend/`: aplicacion cliente.
- `scripts/ci/`: scripts de metricas y reportes.
- `docs/metrics/`: salida y plantillas para analisis CI/CD.
- `Jenkinsfile`: pipeline principal.

## Docker backend (opcional)
```bash
cd backend
docker build -t mi-tienda-backend:latest .
docker run -p 4000:4000 -e PORT=4000 -e NODE_ENV=production mi-tienda-backend:latest
```

## Licencia
MIT. Ver `LICENSE`.
