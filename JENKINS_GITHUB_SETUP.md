# Configuración de Jenkins Pipeline con GitHub

## Variables de Entorno Requeridas

Para utilizar este Jenkinsfile con GitHub, necesitas configurar las siguientes variables:

### 1. Credenciales de GitHub
- **ID de Credenciales**: `github-credentials`
- **Tipo**: Username with password o SSH Private Key
- **Configurar en**: Jenkins → Manage Jenkins → Manage Credentials

### 2. Variables de Entorno en el Pipeline
```groovy
environment {
    GITHUB_REPO = "https://github.com/TU-USUARIO/TU-REPOSITORIO.git"
    GITHUB_CREDENTIALS = "github-credentials"
}
```

### 3. Configuración del Repositorio GitHub

#### Paso 1: Crear repositorio en GitHub
```bash
# Si aún no tienes repositorio remoto
gh repo create project_ci_cd --public --source=. --remote=origin --push
```

#### Paso 2: Configurar remote origin
```bash
git remote add origin https://github.com/TU-USUARIO/project_ci_cd.git
git branch -M main
git push -u origin main
```

#### Paso 3: Actualizar URL en Jenkinsfile
Editar la línea:
```groovy
GITHUB_REPO = "https://github.com/TU-USUARIO/project_ci_cd.git"
```

### 4. Configuración de Webhooks (Opcional)

Para triggers automáticos en GitHub pushes:

1. Ve a tu repositorio GitHub
2. Settings → Webhooks → Add webhook
3. Payload URL: `http://TU-JENKINS-SERVER/github-webhook/`
4. Content type: `application/json`
5. Events: `Push events` y `Pull requests`

## Características del Nuevo Pipeline

### Mejoras Implementadas:

✅ **GitHub Integration**
- Checkout automático desde GitHub
- Credenciales seguras
- Información detallada del commit

✅ **Cross-Platform Support**
- Compatible con Windows y Linux
- Comandos adaptativos según OS

✅ **Parallel Execution**
- Instalación paralela de dependencias
- Tests paralelos (frontend/backend)
- Builds paralelos

✅ **Enhanced Error Handling**
- Try-catch para operaciones críticas
- Graceful fallbacks
- Detailed error reporting

✅ **Improved Artifacts**
- Timestamped artifacts
- Comprehensive packaging
- Docker image tagging

✅ **Better Notifications**
- Rich Slack notifications
- Build status details
- Commit information

✅ **Quality Gates**
- ESLint integration
- Coverage reports
- Health checks

## Scripts de Configuración Rápida

### setup-github.sh
```bash
#!/bin/bash
echo "Configurando repositorio GitHub..."

# Solicitar datos del usuario
read -p "GitHub username: " GITHUB_USER
read -p "Repository name: " REPO_NAME

# Crear repositorio y configurar remote
gh repo create $REPO_NAME --public --source=. --remote=origin --push

# Actualizar Jenkinsfile
sed -i "s|tu-usuario|$GITHUB_USER|g" Jenkinsfile
sed -i "s|project_ci_cd|$REPO_NAME|g" Jenkinsfile

echo "Configuración completada!"
echo "URL del repositorio: https://github.com/$GITHUB_USER/$REPO_NAME"
```

### setup-jenkins-credentials.md
```markdown
## Configurar Credenciales en Jenkins

1. **Ir a Jenkins Dashboard**
   - Manage Jenkins → Manage Credentials

2. **Crear nueva credencial**
   - Domain: Global credentials
   - Kind: Username with password
   - ID: `github-credentials`
   - Username: Tu GitHub username
   - Password: Tu GitHub Personal Access Token

3. **Crear Personal Access Token**
   - GitHub → Settings → Developer settings → Personal access tokens
   - Scopes necesarios: `repo`, `workflow`
```

## Comandos de Validación

```bash
# Verificar configuración Git
git remote -v
git status

# Verificar estructura del proyecto
ls -la frontend/ backend/

# Verificar Jenkins connectivity (si tienes Jenkins CLI)
java -jar jenkins-cli.jar -s http://localhost:8080/ who-am-i
```

## Troubleshooting

### Error: "No remote origin configured"
```bash
git remote add origin https://github.com/TU-USUARIO/project_ci_cd.git
```

### Error: "Credentials not found"
- Verificar que el ID de credenciales sea exactamente `github-credentials`
- Recrear credenciales en Jenkins

### Error: "Node.js not found"
- Instalar Node.js en el agente Jenkins
- Usar Docker agent con Node.js

### Pipeline muy lento
- Usar `npm ci` en lugar de `npm install`
- Configurar caché NPM
- Usar parallel stages

## Próximos Pasos

1. **Configurar repositorio GitHub**
2. **Configurar credenciales Jenkins** 
3. **Actualizar URL del repositorio**
4. **Probar el pipeline**
5. **Configurar webhooks opcionales**