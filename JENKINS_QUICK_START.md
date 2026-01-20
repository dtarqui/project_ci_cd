# Quick Setup Checklist - Jenkins

## Antes de Empezar

- [ ] Jenkins instalado en tu servidor
- [ ] Acceso a Jenkins UI (usualmente http://localhost:8080)
- [ ] Agente Jenkins disponible

---

## Paso 1: Instalar Plugins (5 min)

En Jenkins: **Manage Jenkins** → **Manage Plugins** → **Available Plugins**

- [ ] Busca "Pipeline" → Instala "Pipeline"
- [ ] Busca "Git" → Instala "Git"
- [ ] Busca "htmlpublisher" → Instala "HTML Publisher"
- [ ] Busca "ansicolor" → Instala "AnsiColor"
- [ ] Reinicia Jenkins cuando termine

**Tiempo: ~5 minutos**

---

## Paso 2: Instalar Node.js en Agente (10 min)

Ejecuta en la máquina del agente Jenkins:

```bash
# Linux/macOS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Verifica v18.x.x
npm --version   # Verifica 9.x.x o superior

# Windows: Descarga e instala manualmente
# https://nodejs.org/en/download/
```

- [ ] Node.js 18+ instalado
- [ ] Git instalado
- [ ] Curl instalado

**Tiempo: ~10 minutos**

---

## Paso 3: Crear Pipeline Job (5 min)

En Jenkins UI:

1. **Home** → **New Item**
   - [ ] Name: `mi-tienda-pipeline`
   - [ ] Type: **Pipeline**
   - [ ] Click **OK**

2. En **Configuration**:

   **General:**
   - [ ] Description: "Pipeline CI/CD para Mi Tienda"
   - [ ] GitHub project: `https://github.com/dtarqui/project_ci_cd`

   **Build Triggers:** (elige uno)
   - [ ] Poll SCM: `H/5 * * * *` (cada 5 minutos)
   - O: Leave empty (ejecutar manualmente)

   **Pipeline:**
   - [ ] Definition: "Pipeline script from SCM"
   - [ ] SCM: **Git**
   - [ ] Repository URL: `https://github.com/dtarqui/project_ci_cd.git`
   - [ ] Branch: `*/main`
   - [ ] Script Path: `Jenkinsfile`

3. Click **Save**

**Tiempo: ~5 minutos**

---

## Paso 4: Validar Requisitos (10 min)

Antes de ejecutar, valida que todo esté listo:

```bash
# En tu carpeta del proyecto
bash validate-jenkins-requirements.sh
```

- [ ] Todos los checks pasaron (verde)
- [ ] Estructura del proyecto OK
- [ ] Git configurado correctamente
- [ ] Tests funcionan localmente

**Tiempo: ~10 minutos**

---

## Paso 5: Primer Build (5 min)

En Jenkins:

1. Ve a tu job: `mi-tienda-pipeline`
2. Click **Build Now**
3. Espera a que termine

Verifica en **Console Output**:
- [ ] GitHub Checkout - OK
- [ ] Environment Setup - OK
- [ ] Dependencies Installation - OK
- [ ] Code Quality - OK (puede ser UNSTABLE si no hay eslint)
- [ ] Unit Testing - OK
- [ ] Build Applications - OK

**Tiempo: ~5-10 minutos**

---

## Pasos Opcionales

### Si quieres Webhooks en GitHub

En tu repo GitHub:

1. **Settings** → **Webhooks** → **Add webhook**
2. Payload URL: `http://TU-JENKINS-IP:8080/github-webhook/`
3. Content type: `application/json`
4. Events: Push events + Pull requests
5. Click **Add webhook**

### Si quieres Slack Notifications

1. Jenkins → **Manage Jenkins** → **Manage Plugins**
   - [ ] Instala "Slack Notification Plugin"

2. Configura en **Configure System**:
   - Slack token de tu workspace
   - Canales por defecto

3. El Jenkinsfile ya tiene los mensajes configurados

---

## Troubleshooting Rápido

| Error | Solución |
|-------|----------|
| "git: command not found" | `sudo apt-get install git` |
| "npm: command not found" | Instala Node.js (Paso 2) |
| "Workspace is locked" | Jenkins → Job → Delete workspace |
| "Plugin not found" | Instala los plugins (Paso 1) |
| "Can't find Jenkinsfile" | Verifica: repo correcto + Script Path = "Jenkinsfile" |
| Tests fallan | Ejecuta localmente: `cd frontend && npm test` |

---

## Checklist Final

- [ ] Jenkins installado y funcionando
- [ ] Plugins instalados (Pipeline, Git, HTML Publisher, AnsiColor)
- [ ] Node.js 18+ en agente Jenkins
- [ ] Pipeline job creado: `mi-tienda-pipeline`
- [ ] Git URL correcta: `https://github.com/dtarqui/project_ci_cd.git`
- [ ] Branch: `*/main`
- [ ] Jenkinsfile path: `Jenkinsfile`
- [ ] Validación pasó: `bash validate-jenkins-requirements.sh`
- [ ] Primer build ejecutado exitosamente

---

## ¡Listo!

Tu Jenkins pipeline está funcionando. A partir de ahora:

- **Manual builds**: Click "Build Now" en Jenkins
- **Auto builds**: Los cambios en GitHub dispararán builds automáticamente (si configuraste polling)
- **Logs**: Console Output en Jenkins
- **Reportes**: HTML coverage reports en cada build

Para más detalles, revisa: **JENKINS_SETUP_GUIA.md**

---

**Tiempo total estimado: 30-40 minutos**