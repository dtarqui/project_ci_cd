# Guia: armar el pipeline en Jenkins

Asume que ya levantaste Jenkins con `docker compose up -d --build` desde esta
carpeta (ver `.env.example`) y que entraste a `http://localhost:8080` con el
usuario admin. El tool `Node18` y los plugins base ya quedan listos solos via
`casc.yaml`; lo que falta es configurar credenciales/correo y crear el job.

## 1. Credenciales obligatorias

### 1.1 `vercel-token`

Los stages **Deploy Backend Vercel** y **Deploy Vercel** (frontend) usan
`withCredentials([string(credentialsId: env.VERCEL_TOKEN_CREDENTIAL_ID, ...)])`,
que por defecto vale `vercel-token`. Sin esta credencial el pipeline falla en
cuanto llega a esos stages.

1. `Manage Jenkins` > `Credentials` > `System` > `Global credentials` > `Add Credentials`.
2. Kind: **Secret text**.
3. Secret: tu token de Vercel (`vercel tokens create` o desde vercel.com/account/tokens).
4. ID: `vercel-token` (tiene que coincidir con `VERCEL_TOKEN_CREDENTIAL_ID` del Jenkinsfile).

### 1.2 `database-url`

El stage **Database Migrations** aplica las migraciones a la base de staging y
compara su esquema con el del codigo antes de desplegar. Necesita la cadena de
conexion de esa base como credencial; sin ella el pipeline se detiene en ese
stage y **no despliega** (es a proposito: desplegar sin migrar es lo que dejo
staging roto en las ejecuciones 18 a 23).

1. `Manage Jenkins` > `Credentials` > `System` > `Global credentials` > `Add Credentials`.
2. Kind: **Secret text**.
3. Secret: la misma `DATABASE_URL` con la que `npx prisma migrate deploy`
   funciona en tu maquina (la de `backend/.env`). Con Supabase sirve el
   **Session pooler** (puerto 5432); el Transaction pooler (6543) no admite
   migraciones.
4. ID: `database-url` (tiene que coincidir con `DB_URL_CREDENTIAL_ID` del Jenkinsfile).

Si el proyecto no tiene base de datos, vacia `DB_MIGRATE_CMD` en el Jenkinsfile
y el stage se omite.

## 2. Correo de notificacion (plugin Extended E-mail / `emailext`)

El bloque `post` (success/failure/unstable) envia un correo HTML a
`NOTIFICATION_EMAIL` (parametro del bloque `environment` del Jenkinsfile, hoy
`dmtarqui@gmail.com`). Si no configuras un servidor SMTP, esos stages van a
fallar o el correo simplemente no sale.

1. `Manage Jenkins` > `System` > seccion **Extended E-mail Notification**.
2. SMTP server: `smtp.gmail.com`, SMTP Port: `587`.
3. Click en **Advanced** para desplegar las opciones.
4. En versiones recientes del plugin ya no existe el checkbox "Use SMTP
   Authentication" — se reemplazo por un selector de **Credentials**:
   1. Click en **+ Add** (junto al dropdown "- none -" de Credentials).
   2. Kind: **Username with password**.
   3. Username: tu correo Gmail completo (ej. `dmtarqui@gmail.com`).
   4. Password: una [contraseña de aplicacion](https://myaccount.google.com/apppasswords)
      de Google — **no** tu contraseña normal de Gmail (con 2FA activado,
      Google genera una especifica solo para SMTP/apps).
   5. ID: opcional (ej. `smtp-gmail`). Click **Add**.
   6. Selecciona la credencial recien creada en el dropdown de Credentials.
5. Marca **Use TLS** (puerto 587 = STARTTLS). No marques "Use SSL" — esa es
   para el puerto 465, no para el 587.
6. Default Recipients: puedes dejarlo vacio, el Jenkinsfile ya define el destinatario.
7. Guarda y prueba con el boton "Test configuration by sending test e-mail"
   (mas abajo en la misma pagina) antes de confiar en que los builds lo van a mandar bien.

Si no te interesa el correo por ahora, puedes ignorar esta seccion: el stage
solo genera un `echo` de aviso y el `emailext` fallaria silenciosamente sin
tumbar el build completo (los bloques `post` no afectan el resultado ya fijado).

**Remitente "address not configured yet":** si el correo llega pero el
nombre del remitente sale como `address not configured yet
<dmtarqui@gmail.com>`, es una config **distinta** a la de SMTP de arriba:

1. `Manage Jenkins` > `System` > seccion **Jenkins Location** (no "Extended
   E-mail Notification").
2. Campo **System Admin e-mail address**: pon algo como
   `Jenkins CI/CD <dmtarqui@gmail.com>`.
3. Guarda. Los siguientes correos van a mostrar ese nombre en vez del
   placeholder.

## 3. Variables que viven en el propio Jenkinsfile

Todo lo que depende del proyecto esta agrupado al inicio del bloque
`environment { }`, bajo **PARAMETROS DEL PROYECTO**. Para adoptar la plantilla
en otro proyecto Node.js + React se cambian esos valores y las etapas no se
tocan; un valor vacio desactiva el paso correspondiente. **No son configurables
desde la UI de Jenkins** — al ser literales de Groovy, siempre valen lo que dice
el archivo.

| Parametro | Para que sirve | Valor en este proyecto |
|---|---|---|
| `PROJECT_DISPLAY_NAME`, `ARTIFACT_PREFIX` | Nombre en la cabecera de los correos y prefijo del paquete `.tar.gz` | `Mi Tienda Online`, `mi-tienda` |
| `NOTIFICATION_EMAIL` | Destinatario de los correos | `dmtarqui@gmail.com` |
| `GITHUB_REPO`, `GIT_BRANCH_SPEC` | Repositorio y rama que se integran | este repo, `*/main` |
| `FRONTEND_DIR`, `BACKEND_DIR` | Carpetas de cada componente en el monorepo | `frontend`, `backend` |
| `BACKEND_START_CMD`, `BACKEND_PORT`, `BACKEND_HEALTH_PATH` | Como arranca el backend y que ruta consulta **Backend Validation** (el servidor recibe `PORT=BACKEND_PORT`) | `node index.js`, `4000`, `/health` |
| `DB_URL_CREDENTIAL_ID` | Credencial con la cadena de conexion de staging (paso 1.2) | `database-url` |
| `DB_MIGRATE_CMD` | Aplica las migraciones pendientes. Vacio = sin stage de migraciones | `npx prisma migrate deploy` |
| `DB_SCHEMA_CHECK_CMD` | Compara el esquema de la base con el del codigo; falla si difieren. Vacio = sin comparacion | `npx prisma migrate diff ... --exit-code` |
| `VERCEL_TOKEN_CREDENTIAL_ID` | Credencial del token de Vercel (paso 1.1) | `vercel-token` |
| `VERCEL_*_PROJECT`, `VERCEL_*_ORG` | IDs de proyecto/org de Vercel (opcionales con `.vercel/project.json`) | vacios |
| `BACKEND_VERCEL_ENV`, `FRONTEND_VERCEL_ENV` | Entorno de Vercel donde se publica; con `production` se despliega con `--prod` | `production` |
| `BACKEND_ENV_VARS` | Variables del backend que se agregan en Vercel (`KEY=VALUE` por linea) | vacio |
| `BACKEND_REQUIRED_ENV` | Variables que deben existir en Vercel antes de desplegar el backend | `JWT_SECRET` |
| `BACKEND_FORCED_ENV` | Variables que el pipeline reemplaza en cada despliegue del backend | las tres de CORS, abiertas a `*` |
| `FRONTEND_API_URL_VAR` | Variable de build del frontend que recibe la URL del backend desplegado | `API_BASE_URL` |
| `FRONTEND_BACKEND_URL_FILE`, `FRONTEND_BACKEND_URL_TOKEN` | Archivo del frontend y marcador que se reemplaza por el dominio del backend | `vercel.json`, `__BACKEND_URL__` |
| `SMOKE_BACKEND_CHECKS`, `SMOKE_FRONTEND_CHECKS` | Comprobaciones sobre la version publicada (seccion 4) | `/health` y `/health/ready` en el backend; `/` en el frontend |

Fuera de ese bloque solo quedan dos literales que Jenkins exige fijos: el tool
`nodejs 'Node18'` (bloque `tools`) y la frecuencia de `pollSCM` (bloque
`triggers`).

**Importante — tu repo `project_ci_cd` es publico en GitHub.** Nunca pongas
secretos reales (`JWT_SECRET`, `DATABASE_URL`, etc.) como texto literal en
`BACKEND_ENV_VARS` dentro del Jenkinsfile: quedarian visibles para cualquiera
en el historial de git. `jenkins/.env` tampoco sirve para esto — solo
controla el login de tu Jenkins local en Docker, nunca "viaja" al build
porque Jenkins hace un `checkout` limpio del repo de GitHub en cada run.

Forma recomendada, sin tocar el Jenkinsfile ni Jenkins:

1. **Secretos del backend (JWT_SECRET, DATABASE_URL, REPOSITORY_MODE, ...):**
   configuralos **una sola vez en el dashboard de Vercel** (Project > Settings >
   Environment Variables > entorno `production`). El stage **Deploy Backend
   Vercel** solo *verifica* que las variables de `BACKEND_REQUIRED_ENV` ya
   existan ahi — si las pones en Vercel una vez, `BACKEND_ENV_VARS` se queda
   vacio para siempre y el deploy nunca falla por esto. La unica que el
   pipeline necesita ademas como credencial de Jenkins es `DATABASE_URL`
   (paso 1.2), porque las migraciones corren en el agente y no en Vercel.
2. **IDs de proyecto/org de Vercel (no son secretos):** corre `vercel link`
   una vez, localmente, dentro de `frontend/` y de `backend/`, y comitea el
   `.vercel/project.json` que genera (Vercel permite comitearlo, no lleva
   secretos). Con eso el CLI detecta el proyecto solo durante `vercel pull`
   en CI y no necesitas llenar `VERCEL_BACKEND_PROJECT`/`ORG` a mano.

   **Este paso no es opcional.** Sin `.vercel/project.json` (ni
   `VERCEL_BACKEND_PROJECT`/`ORG` en el Jenkinsfile), el comando
   `vercel env ls production --token ...` que corre el stage **Deploy
   Backend Vercel** no sabe a que proyecto preguntarle, no devuelve nada, y
   el pipeline reporta "JWT_SECRET no configurado" **aunque ya lo hayas
   puesto en el dashboard de Vercel** — es un falso negativo, no que la
   variable se haya perdido.

   Para vincular sin instalar nada global (usa `npx`, queda acotado al
   proyecto):

   ```powershell
   cd backend
   npx vercel login      # confirma por correo/navegador
   npx vercel link       # elige tu scope y "Link to existing project" -> el proyecto backend

   cd ..\frontend
   npx vercel link       # ya no pide login; elige el proyecto frontend
   ```

   Esto crea `backend/.vercel/project.json` y `frontend/.vercel/project.json`
   (no llevan secretos, se pueden comitear). Verifica tambien que
   `JWT_SECRET` este marcado para el entorno **Production** en el dashboard
   de Vercel — el pipeline usa `BACKEND_VERCEL_ENV = "production"` por
   defecto y no revisa Preview/Development.

   **Truco rapido:** `vercel link` suele agregar `.vercel` al `.gitignore`
   de esa carpeta. Si pasa, `project.json` queda ignorado y nunca llega a
   GitHub aunque exista en tu disco (Jenkins clona limpio, no ve tu carpeta
   local). Forzarlo a subir:
   ```
   git add -f backend/.vercel/project.json frontend/.vercel/project.json
   ```
   (El resto de `.vercel/` y cualquier `.env*` sí deben quedar ignorados —
   ahi guarda tokens locales.)

Si en el futuro quieres rotar secretos *desde* Jenkins en vez de tocar el
dashboard de Vercel a mano, la forma correcta es una Jenkins Credential
(igual que `vercel-token`, paso 1) inyectada con `withCredentials` — nunca
como texto literal en `environment{}`. Eso implica editar el Jenkinsfile.

El stage **Deploy Backend Vercel** revisa que las variables de
`BACKEND_REQUIRED_ENV` ya existan en el proyecto de Vercel (o vengan en
`BACKEND_ENV_VARS`) y **aborta el deploy si falta alguna** — es el error mas
comun al probar esto por primera vez.

## 4. Lo que protege a staging: migraciones y verificacion posterior

Tres pasos del pipeline evitan que un despliegue roto termine en verde:

1. **Limpieza de reportes (stage GitHub Checkout).** Antes de todo se borran
   `junit.xml` y `coverage/` de la ejecucion anterior. El espacio de trabajo se
   reutiliza entre builds, y sin esta limpieza un build que se detenia antes de
   las pruebas archivaba como propios los resultados del anterior. Ahora, si un
   componente no corrio pruebas, el reporte de metricas lo dice ("no
   ejecutadas") en lugar de copiar cifras ajenas.
2. **Database Migrations (antes de desplegar).** Corre `DB_MIGRATE_CMD` (aplica
   las migraciones pendientes) y despues `DB_SCHEMA_CHECK_CMD`, que compara el
   esquema real de la base con `prisma/schema.prisma` y falla si difieren: atrapa
   tanto una migracion sin aplicar como un cambio del esquema sin su migracion.
   Si falla, no se despliega nada.

   **Primer build con una base que ya existe.** Si la base ya tiene las tablas
   pero no registra la migracion `0_init` en su tabla `_prisma_migrations`,
   `migrate deploy` intenta crearlas de nuevo y falla con **P3005** ("The
   database schema is not empty"). Se resuelve una sola vez, desde `backend/` y
   con la `DATABASE_URL` de staging en el entorno:

   ```bash
   npx prisma migrate status                      # muestra que registra la base
   npx prisma migrate resolve --applied 0_init    # solo si las tablas ya existen
   ```

3. **Post-Deploy Smoke Test (despues de desplegar).** `scripts/ci/smoke-test.js`
   consulta la version publicada. Cada entrada de `SMOKE_BACKEND_CHECKS` y
   `SMOKE_FRONTEND_CHECKS` es `RUTA` o `RUTA=>TEXTO` (separadas por `;`): la ruta
   debe responder 2xx y, si se indica, contener `TEXTO`. Reintenta tres veces
   con 10 s de espera para absorber el arranque en frio de las funciones de
   Vercel. Si alguna falla, el build termina en **FAILURE** y el correo lo dice.

   En este proyecto el backend expone `GET /health/ready`, que en modo
   `database` consulta cada tabla con las columnas que espera el cliente de
   Prisma y responde 503 si falta alguna. La comprobacion exige ademas
   `"repositoryMode":"database"`, para detectar un despliegue que, por faltar
   `REPOSITORY_MODE` en Vercel, este sirviendo datos en memoria. Otro proyecto
   que adopte la plantilla debe ofrecer una ruta equivalente o ajustar las
   comprobaciones.

El estado de ambos stages queda en el correo (filas "Migraciones" y
"Verificacion staging") y en el reporte de metricas de cada build.

## 5. Crear el Pipeline Job

### 5.1 Crear el item y revisar la pestaña General

1. `New Item` > nombre (ej. `project_ci_cd`) > tipo **Pipeline** > OK. Esto
   te deja directo en la pantalla de configuracion, arrancando por la
   seccion **General**.
2. Ahi apareceran varios checkboxes; para este pipeline ninguno es
   obligatorio, pero vale la pena saber que hace cada uno:
   - **Discard old builds**: dejalo **destildado**. El propio Jenkinsfile ya
     trae `buildDiscarder(logRotator(numToKeepStr: '10'))` en su bloque
     `options{}` — Jenkins ya limpia builds viejos solo, no hace falta
     repetirlo aca.
   - **Do not allow concurrent builds**: opcional. Marcalo solo si te
     preocupa que dos builds corran a la vez sobre el mismo checkout;
     para un pipeline personal puedes dejarlo destildado.
   - **Do not allow the pipeline to resume if the controller restarts**:
     dejalo destildado (default esta bien).
   - **GitHub project**: marcalo y pon la Project url
     `https://github.com/dtarqui/project_ci_cd`. Esto solo enlaza el job
     con el repo en la UI de Jenkins (breadcrumb, badge de GitHub) — **no**
     define de donde se clona el codigo, eso lo hace la seccion "Pipeline"
     mas abajo. El campo **Display name** que aparece bajo "Advanced" es
     nada mas una etiqueta visual para ese enlace (ej. "Proyecto
     Especialidad"); poner algo ahi o dejarlo vacio no cambia el
     comportamiento del pipeline.
   - **Pipeline speed/durability override**, **Preserve stashes from
     completed builds**, **This project is parameterized**, **Throttle
     builds**: ninguno aplica a este pipeline (no tiene parametros ni
     necesita afinar durabilidad) — dejalos como estan por defecto.
3. Baja hasta la seccion **Pipeline**, mas abajo en la misma pagina, y segui
   con el punto 5.2.

### 5.2 Configurar la definicion del pipeline

1. Definition: `Pipeline script from SCM`.
2. SCM: `Git`.
   - Repository URL: `https://github.com/dtarqui/project_ci_cd.git`
   - Credentials: ninguna (repo publico).
   - Branch Specifier: `*/main`.
3. Script Path: `Jenkinsfile`.
4. Guarda.

No hace falta tocar "Build Triggers" en la UI: el propio Jenkinsfile trae
`triggers { pollSCM('H/5 * * * *') }`, asi que Jenkins revisa el repo cada 5
minutos despues del primer build manual. Para el primer run, dale click a
**Build Now**.

## 6. Que esperar del primer build

- Descarga Node 18.20.4 (tool `Node18`) — puede tardar un minuto extra solo
  la primera vez.
- Stages de deploy (`Deploy Backend Vercel`, `Deploy Vercel`) instalan el CLI
  de Vercel (`npm install -g vercel`) en cada build; si no configuraste el
  proyecto de Vercel (paso 3), el CLI te pedira vincular uno interactivo y el
  build se puede quedar colgado hasta el timeout de 20 min (`options.timeout`)
  — por eso conviene resolver el paso 3 antes del primer build real.
- `Database Migrations` falla con P3005 si la base existente no registra
  `0_init` (seccion 4, punto 2): resuelvelo una vez y relanza.
- Resultados quedan en el build: `Test Report`, `Frontend/Backend Coverage
  Report` (HTML publicado via `publishHTML`), y en `Artifacts` el tarball
  `<ARTIFACT_PREFIX>-<build>-<timestamp>.tar.gz` mas todo `docs/metrics/*`
  (generado por `scripts/ci/generate-ci-metrics.js` y
  `generate-research-reports.js` en el bloque `post.always`).

## 7. Problemas comunes

| Sintoma | Causa probable |
|---|---|
| Falla en "Environment Setup" con "Node.js no esta en PATH" | El tool en Jenkins no se llama exactamente `Node18` (revisa `Manage Jenkins > Tools`). |
| Falla en "Deploy Backend Vercel" con "JWT_SECRET no configurado" **aunque ya lo pusiste en el dashboard de Vercel** | Falta vincular el proyecto (`.vercel/project.json`) — sin eso `vercel env ls` no sabe a que proyecto preguntar y siempre da falso negativo. Ver paso 3.2. Tambien revisa que `JWT_SECRET` este en el entorno **Production**, no Preview/Development. |
| No llega ningun correo | SMTP no configurado (paso 2), o `NOTIFICATION_EMAIL` esta mal escrito en el Jenkinsfile. |
| `withCredentials` falla con "vercel-token" o "database-url" no encontrado | La credencial no existe o su ID no coincide con `VERCEL_TOKEN_CREDENTIAL_ID` / `DB_URL_CREDENTIAL_ID` (paso 1). |
| "Database Migrations" falla con **P3005** ("The database schema is not empty") | La base ya tiene las tablas pero no registra `0_init`. Marcala como aplicada una sola vez (seccion 4, punto 2). |
| "Database Migrations" falla en la comparacion de esquema (codigo de salida 2) y lista diferencias | El esquema de la base no coincide con `schema.prisma`: falta una migracion (alguien cambio el schema sin `prisma migrate dev`) o la base se modifico a mano. Crea la migracion que falta y comitea. |
| "Database Migrations" se queda colgado o falla al conectar | La `DATABASE_URL` de la credencial es la del Transaction pooler (6543); usa el Session pooler (5432) — paso 1.2. |
| "Post-Deploy Smoke Test" falla con HTTP 401/403 | Proteccion de despliegues de Vercel sobre la URL del deploy. Desactivala para el entorno o apunta `SMOKE_BACKEND_BASE_URL`/`SMOKE_FRONTEND_BASE_URL` al dominio de produccion. |
| "Post-Deploy Smoke Test" falla en `/health/ready` con 503 y un modelo con codigo `P2022` | Falta una columna en esa tabla: el codigo desplegado no coincide con la base. Normalmente lo atrapa antes la comparacion de esquema; revisa que `DB_SCHEMA_CHECK_CMD` no este vacio. |
| "Post-Deploy Smoke Test" falla con "la respuesta no contiene \"repositoryMode\":\"database\"" | El backend desplegado esta usando datos en memoria: falta `REPOSITORY_MODE=database` (o `DATABASE_URL`) en las variables de Vercel del backend. |
| Build se queda colgado ~20 min y termina en timeout | El CLI de Vercel esta pidiendo vincular el proyecto interactivamente porque falta `VERCEL_*_PROJECT`/`VERCEL_*_ORG` o no hay `.vercel/project.json` en el repo. |
| Backend deployado tira `PrismaClientInitializationError: could not locate the Query Engine for runtime "rhel-openssl-3.0.x"` | El motor de Prisma se genero solo para la plataforma donde corrio `prisma generate` (Jenkins, Debian) y Vercel corre sobre `rhel-openssl-3.0.x`. Agrega `binaryTargets = ["native", "rhel-openssl-3.0.x"]` al bloque `generator client` en `backend/prisma/schema.prisma` y vuelve a desplegar (ya corregido). |
| Correo de build sale con `null` en cada fila de la tabla de metricas (Build, Commit, Autor, etc.) | Bug del Groovy sandboxeado de Jenkins (CPS): el closure de 2 parametros `{ label, value -> }` en `buildEmailStatsTable` no destructura cada fila `['label', 'valor']` de forma confiable — el primer parametro recibe la fila completa como texto y el segundo queda `null`. Se arreglo indexando `row[0]`/`row[1]` en vez de depender de esa destructuracion implicita (ya corregido). |
| Remitente del correo sale como "address not configured yet \<tu-correo\>" | No es SMTP — falta el campo **System Admin e-mail address** en `Manage Jenkins > System > Jenkins Location` (distinto de "Extended E-mail Notification"). Ver nota al final del paso 2. |
