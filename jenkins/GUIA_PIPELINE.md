# Guia: armar el pipeline en Jenkins

Asume que ya levantaste Jenkins con `docker compose up -d --build` desde esta
carpeta (ver `.env.example`) y que entraste a `http://localhost:8080` con el
usuario admin. El tool `Node18` y los plugins base ya quedan listos solos via
`casc.yaml`; lo que falta es configurar credenciales/correo y crear el job.

## 1. Credencial obligatoria: `vercel-token`

Los stages **Deploy Backend Vercel** y **Deploy Vercel** (frontend) usan
`withCredentials([string(credentialsId: 'vercel-token', ...)])`. Sin esta
credencial el pipeline falla en cuanto llega a esos stages.

1. `Manage Jenkins` > `Credentials` > `System` > `Global credentials` > `Add Credentials`.
2. Kind: **Secret text**.
3. Secret: tu token de Vercel (`vercel tokens create` o desde vercel.com/account/tokens).
4. ID: `vercel-token` (tiene que ser exactamente ese string, es el `credentialsId` del Jenkinsfile).

## 2. Correo de notificacion (plugin Extended E-mail / `emailext`)

El bloque `post` (success/failure/unstable) envia un correo HTML a
`NOTIFICATION_EMAIL` (hardcodeado en el Jenkinsfile como `dmtarqui@gmail.com`,
linea ~119). Si no configuras un servidor SMTP, esos stages van a fallar o el
correo simplemente no sale.

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

## 3. Variables que viven en el propio Jenkinsfile

Ojo: `VERCEL_BACKEND_PROJECT`, `VERCEL_BACKEND_ORG`, `VERCEL_FRONTEND_PROJECT`,
`VERCEL_FRONTEND_ORG` y `BACKEND_ENV_VARS` estan definidas en el bloque
`environment { }` del Jenkinsfile (lineas ~101-108) como strings vacios. **No
son configurables desde la UI de Jenkins** — al ser literales de Groovy,
siempre valen lo que dice el archivo.

**Importante — tu repo `project_ci_cd` es publico en GitHub.** Nunca pongas
secretos reales (`JWT_SECRET`, `DATABASE_URL`, etc.) como texto literal en
`BACKEND_ENV_VARS` dentro del Jenkinsfile: quedarian visibles para cualquiera
en el historial de git. `jenkins/.env` tampoco sirve para esto — solo
controla el login de tu Jenkins local en Docker, nunca "viaja" al build
porque Jenkins hace un `checkout` limpio del repo de GitHub en cada run.

Forma recomendada, sin tocar el Jenkinsfile ni Jenkins:

1. **Secretos del backend (JWT_SECRET, DATABASE_URL, ...):** configuralos
   **una sola vez en el dashboard de Vercel** (Project > Settings >
   Environment Variables > entorno `production`). El stage **Deploy Backend
   Vercel** solo *verifica* que `JWT_SECRET` ya exista ahi — si lo pones en
   Vercel una vez, `BACKEND_ENV_VARS` se queda vacio para siempre y el deploy
   nunca falla por esto.
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
   defecto (linea ~109 del Jenkinsfile) y no revisa Preview/Development.

Si en el futuro quieres rotar secretos *desde* Jenkins en vez de tocar el
dashboard de Vercel a mano, la forma correcta es una Jenkins Credential
(igual que `vercel-token`, paso 1) inyectada con `withCredentials` — nunca
como texto literal en `environment{}`. Eso implica editar el Jenkinsfile;
avisame si en algun momento quieres que lo prepare asi.

El stage **Deploy Backend Vercel** revisa que `JWT_SECRET` ya exista como
variable de entorno en el proyecto de Vercel (o venga en `BACKEND_ENV_VARS`)
y **aborta el deploy si no lo encuentra** — es el error mas comun al probar
esto por primera vez.

## 4. Crear el Pipeline Job

### 4.1 Crear el item y revisar la pestaña General

1. `New Item` > nombre (ej. `project_ci_cd`) > tipo **Pipeline** > OK. Esto
   te deja directo en la pantalla de configuracion, arrancando por la
   seccion **General**.
2. Ahi apareceran varios checkboxes; para este pipeline ninguno es
   obligatorio, pero vale la pena saber que hace cada uno:
   - **Discard old builds**: dejalo **destildado**. El propio Jenkinsfile ya
     trae `buildDiscarder(logRotator(numToKeepStr: '10'))` en su bloque
     `options{}` (linea ~123) — Jenkins ya limpia builds viejos solo, no
     hace falta repetirlo aca.
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
   con el punto 4.2.

### 4.2 Configurar la definicion del pipeline

1. Definition: `Pipeline script from SCM`.
2. SCM: `Git`.
   - Repository URL: `https://github.com/dtarqui/project_ci_cd.git`
   - Credentials: ninguna (repo publico).
   - Branch Specifier: `*/main`.
3. Script Path: `Jenkinsfile`.
4. Guarda.

No hace falta tocar "Build Triggers" en la UI: el propio Jenkinsfile trae
`triggers { pollSCM('H/5 * * * *') }` (linea ~131), asi que Jenkins revisa el
repo cada 5 minutos despues del primer build manual. Para el primer run,
dale click a **Build Now**.

## 5. Que esperar del primer build

- Descarga Node 18.20.4 (tool `Node18`) — puede tardar un minuto extra solo
  la primera vez.
- Stages de deploy (`Deploy Backend Vercel`, `Deploy Vercel`) instalan el CLI
  de Vercel (`npm install -g vercel`) en cada build; si no configuraste el
  proyecto de Vercel (paso 3), el CLI te pedira vincular uno interactivo y el
  build se puede quedar colgado hasta el timeout de 20 min (`options.timeout`,
  linea ~124) — por eso conviene resolver el paso 3 antes del primer build real.
- Resultados quedan en el build: `Test Report`, `Frontend/Backend Coverage
  Report` (HTML publicado via `publishHTML`), y en `Artifacts` el tarball
  `mi-tienda-<build>-<timestamp>.tar.gz` mas todo `docs/metrics/*` (generado
  por `scripts/ci/generate-ci-metrics.js` y `generate-research-reports.js`
  en el bloque `post.always`).

## 6. Problemas comunes

| Sintoma | Causa probable |
|---|---|
| Falla en "Environment Setup" con "Node.js no esta en PATH" | El tool en Jenkins no se llama exactamente `Node18` (revisa `Manage Jenkins > Tools`). |
| Falla en "Deploy Backend Vercel" con "JWT_SECRET no configurado" **aunque ya lo pusiste en el dashboard de Vercel** | Falta vincular el proyecto (`.vercel/project.json`) — sin eso `vercel env ls` no sabe a que proyecto preguntar y siempre da falso negativo. Ver paso 3.2. Tambien revisa que `JWT_SECRET` este en el entorno **Production**, no Preview/Development. |
| No llega ningun correo | SMTP no configurado (paso 2), o `NOTIFICATION_EMAIL` esta mal escrito en el Jenkinsfile. |
| `withCredentials` falla con "vercel-token" no encontrado | La credencial no existe o el ID no es exactamente `vercel-token` (paso 1). |
| Build se queda colgado ~20 min y termina en timeout | El CLI de Vercel esta pidiendo vincular el proyecto interactivamente porque falta `VERCEL_*_PROJECT`/`VERCEL_*_ORG` o no hay `.vercel/project.json` en el repo. |
