# Guia: armar el pipeline en Jenkins

Parte de un Jenkins levantado con `docker compose up -d --build` desde esta
carpeta (ver `.env.example`) y accesible en `http://localhost:8080` con el
usuario admin. El tool `Node18` y los plugins base quedan configurados por
`casc.yaml`; falta configurar las credenciales y el correo, y crear el job.

## 1. Credenciales obligatorias

### 1.1 `vercel-token`

Los stages **Deploy Backend Vercel** y **Deploy Vercel** (frontend) usan
`withCredentials([string(credentialsId: env.VERCEL_TOKEN_CREDENTIAL_ID, ...)])`,
que por defecto vale `vercel-token`. Sin esta credencial el pipeline falla al
llegar a esos stages.

1. `Manage Jenkins` > `Credentials` > `System` > `Global credentials` > `Add Credentials`.
2. Kind: **Secret text**.
3. Secret: el token de Vercel (`vercel tokens create` o desde vercel.com/account/tokens).
4. ID: `vercel-token` (debe coincidir con `VERCEL_TOKEN_CREDENTIAL_ID` del Jenkinsfile).

### 1.2 `database-url`

El stage **Database Migrations** aplica las migraciones a la base de staging y
compara su esquema con el del codigo antes de desplegar. Necesita la cadena de
conexion de esa base como credencial; sin ella el pipeline se detiene en ese
stage y **no despliega**. Es intencional: desplegar codigo cuyo esquema no
coincide con la base deja la aplicacion publicada inoperante aunque el build
termine en verde.

1. `Manage Jenkins` > `Credentials` > `System` > `Global credentials` > `Add Credentials`.
2. Kind: **Secret text**.
3. Secret: la cadena de conexion de la base de staging, la misma con la que
   `npx prisma migrate deploy` funciona en local (`backend/.env`). Con Supabase
   sirve el **Session pooler** (puerto 5432); el Transaction pooler (6543) no
   admite migraciones.
4. ID: `database-url` (debe coincidir con `DB_URL_CREDENTIAL_ID` del Jenkinsfile).

Si el proyecto no tiene base de datos, se vacia `DB_MIGRATE_CMD` en el
Jenkinsfile y el stage se omite.

## 2. Correo de notificacion (plugin Email Extension / `emailext`)

El bloque `post` (success/failure/unstable) envia un correo HTML a
`NOTIFICATION_EMAIL` (bloque PARAMETROS DEL PROYECTO del Jenkinsfile). Sin un
servidor SMTP configurado, el correo no se envia.

1. `Manage Jenkins` > `System` > seccion **Extended E-mail Notification**.
2. SMTP server: `smtp.gmail.com`, SMTP Port: `587`.
3. Click en **Advanced** para desplegar las opciones.
4. En las versiones recientes del plugin el checkbox "Use SMTP Authentication"
   se reemplazo por un selector de **Credentials**:
   1. Click en **+ Add** (junto al desplegable "- none -" de Credentials).
   2. Kind: **Username with password**.
   3. Username: la direccion completa de la cuenta de Gmail que envia los
      correos (p. ej. `usuario@gmail.com`).
   4. Password: una [contraseña de aplicacion](https://myaccount.google.com/apppasswords)
      de Google, **no** la contraseña normal de la cuenta (con 2FA activado,
      Google genera una especifica para SMTP).
   5. ID: opcional (p. ej. `smtp-gmail`). Click en **Add**.
   6. Seleccionar la credencial recien creada en el desplegable de Credentials.
5. Marcar **Use TLS** (puerto 587 = STARTTLS). "Use SSL" corresponde al
   puerto 465, no al 587.
6. Default Recipients: puede quedar vacio; el Jenkinsfile define el destinatario.
7. Guardar y probar con el boton "Test configuration by sending test e-mail"
   (mas abajo en la misma pagina) antes del primer build.

La seccion es opcional: sin SMTP, `emailext` falla sin alterar el resultado del
build, porque los bloques `post` no modifican el resultado ya fijado.

**Remitente "address not configured yet".** Si el correo llega pero el
remitente figura como `address not configured yet <usuario@gmail.com>`, falta
una configuracion **distinta** de la de SMTP:

1. `Manage Jenkins` > `System` > seccion **Jenkins Location** (no "Extended
   E-mail Notification").
2. Campo **System Admin e-mail address**: un valor como
   `Jenkins CI/CD <usuario@gmail.com>`.
3. Guardar. Los correos siguientes muestran ese nombre.

## 3. Parametros del Jenkinsfile

Todo lo que depende del proyecto esta agrupado al inicio del bloque
`environment { }`, bajo **PARAMETROS DEL PROYECTO**. Para adoptar la plantilla
en otro proyecto Node.js + React se cambian esos valores y las etapas no se
tocan; un valor vacio desactiva el paso correspondiente. **No son configurables
desde la interfaz de Jenkins**: al ser literales de Groovy, valen lo que dice el
archivo.

| Parametro | Para que sirve | Valor en este proyecto |
|---|---|---|
| `PROJECT_DISPLAY_NAME`, `ARTIFACT_PREFIX` | Nombre en la cabecera de los correos y prefijo del paquete `.tar.gz` | `Mi Tienda Online`, `mi-tienda` |
| `NOTIFICATION_EMAIL` | Destinatario de los correos | `dmtarqui@gmail.com` |
| `GITHUB_REPO`, `GIT_BRANCH_SPEC` | Repositorio y rama que se integran | este repositorio, `*/main` |
| `FRONTEND_DIR`, `BACKEND_DIR` | Carpetas de cada componente en el monorepo | `frontend`, `backend` |
| `BACKEND_START_CMD`, `BACKEND_PORT`, `BACKEND_HEALTH_PATH` | Como arranca el backend y que ruta consulta **Backend Validation** (el servidor recibe `PORT=BACKEND_PORT`) | `node index.js`, `4000`, `/health` |
| `DB_URL_CREDENTIAL_ID` | Credencial con la cadena de conexion de staging (paso 1.2) | `database-url` |
| `DB_MIGRATE_CMD` | Aplica las migraciones pendientes. Vacio = sin stage de migraciones | `npx prisma migrate deploy` |
| `DB_SCHEMA_CHECK_CMD` | Compara el esquema de la base con el del codigo; falla si difieren. Vacio = sin comparacion | `npx prisma migrate diff ... --exit-code` |
| `VERCEL_TOKEN_CREDENTIAL_ID` | Credencial del token de Vercel (paso 1.1) | `vercel-token` |
| `VERCEL_*_PROJECT`, `VERCEL_*_ORG` | IDs de proyecto y organizacion de Vercel (opcionales con `.vercel/project.json`) | vacios |
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

**Importante: el repositorio es publico en GitHub.** No deben escribirse
secretos reales (`JWT_SECRET`, `DATABASE_URL`, etc.) como texto literal en
`BACKEND_ENV_VARS` dentro del Jenkinsfile: quedarian visibles para cualquiera
en el historial de git. `jenkins/.env` tampoco sirve para esto: solo configura
el acceso al Jenkins local en Docker y nunca llega al build, porque Jenkins
hace un checkout limpio del repositorio en cada ejecucion.

Forma recomendada, sin modificar el Jenkinsfile ni Jenkins:

1. **Secretos del backend (`JWT_SECRET`, `DATABASE_URL`, `REPOSITORY_MODE`, ...):**
   se configuran **una sola vez en el dashboard de Vercel** (Project > Settings >
   Environment Variables > entorno `production`). El stage **Deploy Backend
   Vercel** solo *verifica* que las variables de `BACKEND_REQUIRED_ENV` existan
   ahi; con ellas en Vercel, `BACKEND_ENV_VARS` queda vacio. La unica que el
   pipeline necesita ademas como credencial de Jenkins es `DATABASE_URL`
   (paso 1.2), porque las migraciones corren en el agente y no en Vercel.
2. **IDs de proyecto y organizacion de Vercel (no son secretos):** se obtienen
   ejecutando `vercel link` una vez, en local, dentro de `frontend/` y de
   `backend/`, y versionando el `.vercel/project.json` que genera (no contiene
   secretos). Con eso el CLI detecta el proyecto durante `vercel pull` en CI y
   no hace falta llenar `VERCEL_BACKEND_PROJECT`/`ORG`.

   **Este paso no es opcional.** Sin `.vercel/project.json` (ni
   `VERCEL_BACKEND_PROJECT`/`ORG` en el Jenkinsfile), el comando
   `vercel env ls production --token ...` del stage **Deploy Backend Vercel**
   no sabe a que proyecto consultar, no devuelve nada, y el pipeline informa
   "JWT_SECRET no configurado" **aunque la variable exista en el dashboard de
   Vercel**: es un falso negativo.

   Para vincular sin instalaciones globales (con `npx`, acotado al proyecto):

   ```powershell
   cd backend
   npx vercel login      # confirmacion por correo o navegador
   npx vercel link       # elegir el scope y "Link to existing project" -> el proyecto backend

   cd ..\frontend
   npx vercel link       # ya no pide login; elegir el proyecto frontend
   ```

   Esto crea `backend/.vercel/project.json` y `frontend/.vercel/project.json`.
   `JWT_SECRET` debe estar marcado para el entorno **Production** en el
   dashboard de Vercel: el pipeline usa `BACKEND_VERCEL_ENV = "production"` y
   no revisa Preview ni Development.

   **Nota:** `vercel link` suele agregar `.vercel` al `.gitignore` de la
   carpeta. En ese caso `project.json` queda ignorado y no llega a GitHub
   aunque exista en disco (Jenkins clona el repositorio; no usa la carpeta
   local). Para versionarlo:
   ```
   git add -f backend/.vercel/project.json frontend/.vercel/project.json
   ```
   El resto de `.vercel/` y cualquier `.env*` deben seguir ignorados, porque
   contienen tokens locales.

Para gestionar los secretos desde Jenkins en lugar del dashboard de Vercel, la
forma correcta es una Jenkins Credential (como `vercel-token`, paso 1)
inyectada con `withCredentials`, nunca texto literal en `environment{}`.
Requiere editar el Jenkinsfile.

El stage **Deploy Backend Vercel** comprueba que las variables de
`BACKEND_REQUIRED_ENV` existan en el proyecto de Vercel (o vengan en
`BACKEND_ENV_VARS`) y **aborta el despliegue si falta alguna**: es el error
mas comun en la primera ejecucion.

## 4. Proteccion de staging: migraciones y verificacion posterior

Tres pasos del pipeline evitan que un despliegue defectuoso termine en verde:

1. **Limpieza de reportes (stage GitHub Checkout).** Antes de todo se borran
   `junit.xml` y `coverage/` de la ejecucion anterior. El espacio de trabajo se
   reutiliza entre builds; sin esta limpieza, un build detenido antes de las
   pruebas archivaria como propios los resultados del anterior. Si un
   componente no ejecuta pruebas, el reporte de metricas lo indica ("no
   ejecutadas").
2. **Database Migrations (antes de desplegar).** Ejecuta `DB_MIGRATE_CMD`
   (aplica las migraciones pendientes) y despues `DB_SCHEMA_CHECK_CMD`, que
   compara el esquema real de la base con `prisma/schema.prisma` y falla si
   difieren: detecta tanto una migracion sin aplicar como un cambio del esquema
   sin su migracion. Si falla, no se despliega nada.

   **Primer build con una base existente.** Si la base ya tiene las tablas pero
   no registra la migracion `0_init` en su tabla `_prisma_migrations`,
   `migrate deploy` intenta crearlas de nuevo y falla con **P3005** ("The
   database schema is not empty"). Se resuelve una sola vez, desde `backend/` y
   con la `DATABASE_URL` de staging en el entorno:

   ```bash
   npx prisma migrate status                      # muestra lo que registra la base
   npx prisma migrate resolve --applied 0_init    # solo si las tablas ya existen
   ```

3. **Post-Deploy Smoke Test (despues de desplegar).** `scripts/ci/smoke-test.js`
   consulta la version publicada. Cada entrada de `SMOKE_BACKEND_CHECKS` y
   `SMOKE_FRONTEND_CHECKS` es `RUTA` o `RUTA=>TEXTO` (separadas por `;`): la ruta
   debe responder 2xx y, si se indica, contener `TEXTO`. Reintenta tres veces
   con 10 s de espera para absorber el arranque en frio de las funciones de
   Vercel. Si alguna comprobacion falla, el build termina en **FAILURE** y el
   correo lo indica.

   En este proyecto el backend expone `GET /health/ready`, que en modo
   `database` consulta cada tabla con las columnas que espera el cliente de
   Prisma y responde 503 si falta alguna. La comprobacion exige ademas
   `"repositoryMode":"database"`, para detectar un despliegue que, por faltar
   `REPOSITORY_MODE` en Vercel, este sirviendo datos en memoria. Otro proyecto
   que adopte la plantilla debe ofrecer una ruta equivalente o ajustar las
   comprobaciones.

El estado de ambos stages figura en el correo (filas "Migraciones" y
"Verificacion staging") y en el reporte de metricas de cada build.

## 5. Crear el Pipeline Job

### 5.1 Crear el item y revisar la pestaña General

1. `New Item` > nombre (p. ej. `project_ci_cd`) > tipo **Pipeline** > OK. Se
   abre la pantalla de configuracion, en la seccion **General**.
2. Ninguna de sus opciones es obligatoria para este pipeline:
   - **Discard old builds**: desmarcado. El Jenkinsfile ya incluye
     `buildDiscarder(logRotator(numToKeepStr: '10'))` en su bloque
     `options{}`.
   - **Do not allow concurrent builds**: opcional; evita que dos builds
     corran a la vez sobre el mismo espacio de trabajo.
   - **Do not allow the pipeline to resume if the controller restarts**:
     desmarcado (valor por defecto).
   - **GitHub project**: marcar e indicar la Project url
     `https://github.com/dtarqui/project_ci_cd`. Solo enlaza el job con el
     repositorio en la interfaz de Jenkins (breadcrumb, badge de GitHub);
     **no** define de donde se clona el codigo, que se configura en la
     seccion "Pipeline". El campo **Display name** de "Advanced" es una
     etiqueta visual para ese enlace y no cambia el comportamiento del
     pipeline.
   - **Pipeline speed/durability override**, **Preserve stashes from
     completed builds**, **This project is parameterized**, **Throttle
     builds**: no aplican a este pipeline (no tiene parametros ni necesita
     ajustar la durabilidad); se dejan con su valor por defecto.
3. A continuacion, en la seccion **Pipeline** de la misma pagina, se sigue el
   punto 5.2.

### 5.2 Configurar la definicion del pipeline

1. Definition: `Pipeline script from SCM`.
2. SCM: `Git`.
   - Repository URL: `https://github.com/dtarqui/project_ci_cd.git`
   - Credentials: ninguna (repositorio publico).
   - Branch Specifier: `*/main`.
3. Script Path: `Jenkinsfile`.
4. Guardar.

No hace falta configurar "Build Triggers" en la interfaz: el Jenkinsfile
incluye `triggers { pollSCM('H/5 * * * *') }`, de modo que Jenkins revisa el
repositorio cada 5 minutos a partir del primer build. El primer build se lanza
con **Build Now**; los siguientes los dispara el polling. Un build lanzado a
mano no produce un valor valido de M2 (tiempo desde el commit hasta staging).

## 6. Que esperar del primer build

- Descarga Node 18.20.4 (tool `Node18`), lo que puede tardar un minuto mas la
  primera vez.
- Los stages de despliegue (`Deploy Backend Vercel`, `Deploy Vercel`) instalan
  el CLI de Vercel (`npm install -g vercel`) en cada build. Si el proyecto de
  Vercel no esta vinculado (seccion 3), el CLI pide vincularlo de forma
  interactiva y el build queda colgado hasta el timeout de 20 min
  (`options.timeout`); por eso la seccion 3 debe resolverse antes del primer
  build.
- `Database Migrations` falla con P3005 si la base existente no registra
  `0_init` (seccion 4, punto 2); se resuelve una vez y se relanza.
- Los resultados quedan en el build: `Test Report`, `Frontend/Backend Coverage
  Report` (HTML publicado con `publishHTML`) y, en `Artifacts`, el paquete
  `<ARTIFACT_PREFIX>-<build>-<timestamp>.tar.gz` y todo `docs/metrics/*`
  (generado por `scripts/ci/generate-ci-metrics.js` y
  `generate-research-reports.js` en el bloque `post.always`).

## 7. Problemas comunes

| Sintoma | Causa probable y solucion |
|---|---|
| Falla en "Environment Setup" con "Node.js no esta en PATH" | El tool de Jenkins no se llama exactamente `Node18` (revisar `Manage Jenkins > Tools`). |
| Falla en "Deploy Backend Vercel" con "JWT_SECRET no configurado" **aunque la variable exista en el dashboard de Vercel** | Falta vincular el proyecto (`.vercel/project.json`): sin eso `vercel env ls` no sabe a que proyecto consultar y da un falso negativo. Ver seccion 3, punto 2. Revisar tambien que `JWT_SECRET` este en el entorno **Production**, no en Preview ni Development. |
| No llega ningun correo | SMTP sin configurar (seccion 2), o `NOTIFICATION_EMAIL` mal escrito en el Jenkinsfile. |
| `withCredentials` falla con "vercel-token" o "database-url" no encontrado | La credencial no existe o su ID no coincide con `VERCEL_TOKEN_CREDENTIAL_ID` / `DB_URL_CREDENTIAL_ID` (seccion 1). |
| "Database Migrations" falla con **P3005** ("The database schema is not empty") | La base ya tiene las tablas pero no registra `0_init`. Marcarla como aplicada una sola vez (seccion 4, punto 2). |
| "Database Migrations" falla en la comparacion de esquema (codigo de salida 2) y lista diferencias | El esquema de la base no coincide con `schema.prisma`: falta una migracion (el schema cambio sin `prisma migrate dev`) o la base se modifico a mano. Crear la migracion que falta y versionarla. |
| "Database Migrations" se queda colgado o falla al conectar | La `DATABASE_URL` de la credencial es la del Transaction pooler (6543); usar el Session pooler (5432), paso 1.2. |
| "Post-Deploy Smoke Test" falla con HTTP 401/403 | Proteccion de despliegues de Vercel sobre la URL del despliegue. Desactivarla para el entorno o apuntar `SMOKE_BACKEND_BASE_URL`/`SMOKE_FRONTEND_BASE_URL` al dominio de produccion. |
| "Post-Deploy Smoke Test" falla en `/health/ready` con 503 y un modelo con codigo `P2022` | Falta una columna en esa tabla: el codigo desplegado no coincide con la base. Normalmente lo detecta antes la comparacion de esquema; revisar que `DB_SCHEMA_CHECK_CMD` no este vacio. |
| "Post-Deploy Smoke Test" falla con "la respuesta no contiene \"repositoryMode\":\"database\"" | El backend desplegado usa datos en memoria: falta `REPOSITORY_MODE=database` (o `DATABASE_URL`) en las variables de Vercel del backend. |
| El build se queda colgado unos 20 min y termina en timeout | El CLI de Vercel pide vincular el proyecto de forma interactiva porque faltan `VERCEL_*_PROJECT`/`VERCEL_*_ORG` o no hay `.vercel/project.json` en el repositorio. |
| El backend desplegado devuelve `PrismaClientInitializationError: could not locate the Query Engine for runtime "rhel-openssl-3.0.x"` | El motor de Prisma se genero solo para la plataforma donde corrio `prisma generate` (el agente de Jenkins), y Vercel usa `rhel-openssl-3.0.x`. Agregar `binaryTargets = ["native", "rhel-openssl-3.0.x"]` al bloque `generator client` de `prisma/schema.prisma` (este repositorio ya lo incluye). |
| El remitente del correo figura como "address not configured yet \<correo\>" | No es un problema de SMTP: falta el campo **System Admin e-mail address** en `Manage Jenkins > System > Jenkins Location` (distinto de "Extended E-mail Notification"). Ver el final de la seccion 2. |
