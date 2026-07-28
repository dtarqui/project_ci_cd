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
Backend (`backend/.env`, copiar de `backend/sample.env`): ese archivo marca cada
variable como **OBLIGATORIA** u **OPCIONAL** con su valor por defecto. En resumen,
lo unico estrictamente obligatorio es `JWT_SECRET` en produccion (32+ caracteres) y
`DATABASE_URL` si usas `REPOSITORY_MODE=database` — todo lo demas (`PORT`, `NODE_ENV`,
`REPOSITORY_MODE`, `CORS_*`, `JWT_EXPIRES_IN`, `JWT_ALGORITHM`, `JWT_ISSUER`,
`JWT_AUDIENCE`) tiene un default seguro para desarrollo.

## Modo base de datos (Prisma + Supabase)
Un solo switch, `REPOSITORY_MODE`, controla toda la capa de datos (users,
customers, products, sales, dashboard):
- `REPOSITORY_MODE=memory` (default) — datos en RAM, sin BD. Es lo que usan
  el desarrollo rápido y los tests automatizados (no requiere `DATABASE_URL`).
- `REPOSITORY_MODE=database` — Postgres real vía Supabase (Prisma).

Para activar el modo `database`:

1. Crear un proyecto en [Supabase](https://supabase.com) y copiar el
   connection string (Project Settings > Database > Connection string).
   Usa el **Session pooler** (no la conexión directa) si tu red no tiene
   salida IPv6 — la conexión directa de Supabase es IPv6-only.
2. En `backend/.env`, definir:

   ```env
   REPOSITORY_MODE=database
   DATABASE_URL=postgresql://postgres.xxxxxxxx:password@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

3. Aplicar el schema (`backend/prisma/schema.prisma`, con las 5 entidades
   `users`, `customers`, `products`, `sales`, `sale_items`):

   ```bash
   cd backend
   npm run prisma:migrate
   npm run db:seed
   ```

4. `npm start` (o `docker compose up --build` dentro de `backend/`) — el
   backend ahora persiste en Postgres en vez de memoria.

Para desplegar el backend en Vercel con BD real, `REPOSITORY_MODE` y
`DATABASE_URL` pueden inyectarse igual que `JWT_SECRET` usando la variable
`BACKEND_ENV_VARS` del `Jenkinsfile`, sin modificar el pipeline.

## Roles de usuario
Cada usuario tiene un `role`: `admin` o `vendedor` (default). Ambos roles
pueden iniciar sesión y usar el dashboard/productos/clientes/ventas; solo
`admin` puede eliminar productos y clientes (`DELETE /api/products/:id`,
`DELETE /api/customers/:id` responden 403 `FORBIDDEN_ROLE` para `vendedor`).
El frontend oculta el botón de eliminar cuando el usuario autenticado no es
`admin`. Usuarios demo: `admin/admin123` (admin), `demo/demo123` y
`test/test123` (vendedor).

Frontend (`frontend/.env`, copiar de `frontend/sample.env`): `API_BASE_URL` es
**OPCIONAL** — si no existe, el frontend usa `http://localhost:4000` en desarrollo
y rutas relativas (`/`) en produccion.

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
MIT — ver `LICENSE`. `backend/package.json` y `frontend/package.json` declaran
`"license": "MIT"` de forma explicita y consistente con este archivo.

Todas las dependencias directas y de desarrollo de ambos proyectos (backend y
frontend, ~430 y ~910 paquetes respectivamente incluyendo transitivas) usan
licencias permisivas — MIT, Apache-2.0, BSD-2/3-Clause, ISC — sin ninguna
licencia copyleft (GPL/AGPL/SSPL) detectada; son compatibles con la licencia
MIT de este repositorio.
