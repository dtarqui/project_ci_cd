# Guía Setup Jenkins para Mi Tienda CI/CD

## Requisitos Previos

- Jenkins instalado (versión 2.387 o superior)
- Acceso a Jenkins (usualmente http://localhost:8080)
- Agente Jenkins con acceso a terminal/shell
- Node.js 18+ instalado en el agente

---

## Paso 1: Instalar Plugins Necesarios

### 1.1 Ir a Panel de Administración
1. Abre Jenkins → **Manage Jenkins** → **Manage Plugins**

### 1.2 Instalar los Plugins Requeridos

**Instala estos plugins (buscar en "Available plugins"):**

| Plugin | ID | Propósito |
|--------|----|----|
| Pipeline | workflow-aggregator | Soporte para Jenkinsfile |
| Git | git | Integración con Git |
| GitHub | github | Webhooks GitHub (opcional) |
| HTML Publisher | htmlpublisher | Mostrar reports HTML |
| Pipeline: Stage View | pipeline-stage-view | Visualizar stages |
| AnsiColor | ansicolor | Colores en logs |

**Pasos:**
1. En "Filter" escribe el nombre del plugin
2. Marca el checkbox
3. Click en "Download now and install after restart"
4. Reinicia Jenkins cuando termine

---

## Paso 2: Configurar Node.js en el Agente

### 2.1 Opción A: Pre-instalar Node.js (Recomendado)

En la máquina que ejecutará Jenkins (agente):

```bash
# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node@18
brew link node@18

# Windows
# Descargar de https://nodejs.org/en/download/
# E instalar manualmente
```

Verifica la instalación:
```bash
node --version    # v18.x.x
npm --version     # 9.x.x o superior
```

### 2.2 Opción B: Usar Jenkins NodeJS Plugin (Alternativo)

Si prefieres que Jenkins maneje las versiones:

1. **Manage Jenkins** → **Tools** → **NodeJS installations**
2. Haz click en "Add NodeJS"
3. Nombre: `Node18`
4. Version: `18.x.x`
5. Salva los cambios

---

## Paso 3: Configurar el Agente Jenkins

### 3.1 Verificar Agente Disponible

1. **Manage Jenkins** → **Manage Nodes and Clouds**
2. Verifica que haya un agente disponible (usualmente `Built-in Node`)

### 3.2 Configurar Agente para Proyectos

1. Click en el agente que usarás
2. Configura:
   - **Remote root directory**: `/var/jenkins_home` (Linux) o `C:\Jenkins` (Windows)
   - **Launch method**: SSH o JNLP según tu setup

3. Verifica que el agente esté **online** (punto verde)

---

## Paso 4: Crear el Job Pipeline

### 4.1 Crear Nuevo Job

1. Jenkins → **New Item**
2. Name: `mi-tienda-pipeline`
3. Type: **Pipeline**
4. Click **OK**

### 4.2 Configurar Pipeline

En la página de configuración:

#### Sección: General
- **Description**: "Pipeline CI/CD para Mi Tienda"
- **GitHub project**: `https://github.com/dtarqui/project_ci_cd`

#### Sección: Build Triggers
Selecciona **UNO** de estos (opcional):

**Opción A: Polling (sin webhooks)**
- Click "Poll SCM"
- Schedule: `H/5 * * * *` (cada 5 minutos)

**Opción B: GitHub Push (con webhook)**
- Click "GitHub hook trigger for GITScm polling"
- Requiere configurar webhook en GitHub (ver Paso 5)

**Opción C: Manual (sin triggers)**
- Dejar sin seleccionar nada
- Ejecutar manualmente desde Jenkins

#### Sección: Pipeline

Selecciona: **Pipeline script from SCM**

Configura:
- **SCM**: Git
- **Repository URL**: `https://github.com/dtarqui/project_ci_cd.git`
- **Branch**: `*/main`
- **Script Path**: `Jenkinsfile`

#### Guardar

Click en **Save**

---

## Paso 5: Configurar tu Repositorio GitHub (Opcional)

### 5.1 Habilitar Webhooks (si quieres triggers automáticos)

1. Ve a tu repo: https://github.com/dtarqui/project_ci_cd
2. **Settings** → **Webhooks** → **Add webhook**

Configura:
- **Payload URL**: `http://TU-IP-JENKINS:8080/github-webhook/`
- **Content type**: `application/json`
- **Events**: 
  - Push events ✓
  - Pull requests ✓
- Click **Add webhook**

### 5.2 Verificar Webhook

En la página de webhooks, deberías ver un ✓ verde después de hacer push.

---

## Paso 6: Ejecutar el Pipeline por Primera Vez

### 6.1 Ejecutar Manualmente

1. En Jenkins, ve a tu job: `mi-tienda-pipeline`
2. Click en **Build Now**
3. Verás el build en progreso

### 6.2 Monitorear la Ejecución

En la página del build:
- **Console Output**: Ver logs en vivo
- **Stage View**: Ver progress visual

---

## Paso 7: Configuraciones Importantes en el Jenkinsfile

### 7.1 Actualizar Variables (si es necesario)

Edita el `Jenkinsfile` en tu repo:

```groovy
environment {
    NODE_VERSION = "18"           # Cambia si usas otra versión
    FRONTEND_DIR = "frontend"      # Ruta del frontend
    BACKEND_DIR = "backend"        # Ruta del backend
    DOCKER_REGISTRY = "docker.io"  # Si usas Docker
}
```

### 7.2 Comentar Secciones Opcionales (si las necesitas más tarde)

Si NO tienes Docker instalado, comenta el stage:
```groovy
// stage('Docker Build') {
//     ...
// }
```

Si NO tienes Slack, ya está manejado con try-catch (no fallará).

---

## Paso 8: Troubleshooting - Problemas Comunes

### ❌ Error: "git command not found"
**Solución:** Instala Git en el agente
```bash
sudo apt-get install git  # Linux
brew install git          # macOS
# Windows: Descargar de https://git-scm.com/
```

### ❌ Error: "npm: command not found"
**Solución:** Instala Node.js (ver Paso 2.1)

### ❌ Error: "workspace is already locked"
**Solución:** Limpia workspace
```bash
Jenkins → job → Delete workspace → Build Now
```

### ❌ Error: "curl: command not found"
**Solución:** Instala curl
```bash
sudo apt-get install curl  # Linux
brew install curl          # macOS
```

### ❌ Error: "Docker daemon is not running"
**Solución:** 
- Omite el stage Docker Build (comenta en Jenkinsfile)
- O inicia Docker daemon: `sudo systemctl start docker`

### ❌ Error: "7z: command not found" (Windows)
**Solución:** Instala 7-Zip o comenta la sección de artifacts comprimidos

### ❌ Error: "publishHTML requires plugin"
**Solución:** Instala "HTML Publisher Plugin" (Paso 1.2)

---

## Paso 9: Verificar Setup Correcto

Ejecuta manualmente y verifica que todos estos stages pasen:

```
✓ GitHub Checkout          - Obtiene el código
✓ Environment Setup        - Verifica Node.js
✓ Dependencies Installation - Instala npm packages
✓ Code Quality            - Lint (ok si falla, es opcional)
✓ Unit Testing            - Runs tests
✓ Build Applications      - Build frontend/backend
✓ Integration Tests       - Tests de API
✓ Package Artifacts       - Empaqueta resultados
```

Si ve los ✓, ¡tu setup está correcto!

---

## Paso 10: Configuración Avanzada (Opcional)

### 10.1 Email Notifications

En Jenkins → **Manage Jenkins** → **Configure System**:

- **Location**: `http://tu-jenkins-url`
- **E-mail Notification**:
  - SMTP server: `smtp.gmail.com`
  - Default user e-mail suffix: `@gmail.com`
  - Click "Advanced..."
  - Use SMTP Authentication ✓
  - Username: tu email
  - Password: tu contraseña app
  - Use TLS ✓

### 10.2 Slack Integration (Opcional)

Ya está en el Jenkinsfile, pero requiere:

1. Jenkins → **Manage Jenkins** → **Manage Plugins**
2. Instala "Slack Notification Plugin"
3. Configura en **Configure System** con tu Slack workspace token

### 10.3 Credenciales SSH para Deploy (Futuro)

Cuando necesites hacer deploy:

1. **Manage Jenkins** → **Manage Credentials** → **System**
2. **Add Credentials**
   - Kind: SSH Username with private key
   - Scope: Global
   - ID: `deploy-ssh`
   - Username: tu usuario en servidor
   - Private key: pega tu clave privada SSH

---

## Resumen Quick Start

Si solo quieres hacer funcionar lo básico en 5 minutos:

```bash
# 1. Instala Node.js en agente Jenkins
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git curl

# 2. En Jenkins UI:
#    - Instala plugins: Pipeline, Git, HTML Publisher
#    - Crea nuevo Pipeline job
#    - URL repo: https://github.com/dtarqui/project_ci_cd.git
#    - Script path: Jenkinsfile
#    - Branch: */main

# 3. Click "Build Now"
# Done!
```

---

## Checklist de Verificación Final

- [ ] Jenkins está instalado y corriendo
- [ ] Plugins instalados: Pipeline, Git, HTML Publisher
- [ ] Node.js 18+ instalado en agente
- [ ] Job Pipeline creado: `mi-tienda-pipeline`
- [ ] Git URL configurada correctamente
- [ ] Jenkinsfile path: `Jenkinsfile`
- [ ] Branch: `*/main`
- [ ] Primer build ejecutado exitosamente
- [ ] Todos los stages pasaron

---

## Documentación Adicional

Para más información:
- Jenkins Pipeline: https://www.jenkins.io/doc/book/pipeline/
- GitHub Integration: https://plugins.jenkins.io/github/
- Jenkins Best Practices: https://www.jenkins.io/doc/book/using/

¡Listo! Tu Jenkins debería estar funcional ahora. 🚀