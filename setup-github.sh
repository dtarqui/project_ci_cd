#!/bin/bash

# Script de configuración GitHub + Jenkins
# Ejecutar con: bash setup-github.sh

set -e

echo "🚀 Configuración de GitHub + Jenkins para proyecto CI/CD"
echo "=================================================="

# Verificar dependencias
command -v git >/dev/null 2>&1 || { echo "Git no está instalado. Abortando."; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "GitHub CLI no está instalado. Instala con: https://cli.github.com/"; exit 1; }

# Verificar autenticación GitHub CLI
if ! gh auth status >/dev/null 2>&1; then
    echo "Primero autentícate con GitHub CLI:"
    echo "gh auth login"
    exit 1
fi

# Solicitar información del usuario
echo ""
read -p "GitHub username: " GITHUB_USER
read -p "Repository name (default: project_ci_cd): " REPO_NAME
REPO_NAME=${REPO_NAME:-project_ci_cd}

# Confirmar configuración
echo ""
echo "Configuración a aplicar:"
echo "- GitHub User: $GITHUB_USER"
echo "- Repository: $REPO_NAME"
echo "- URL: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""
read -p "¿Continuar? (y/N): " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Configuración cancelada."
    exit 0
fi

echo ""
echo "📁 Verificando estructura del proyecto..."

# Verificar que estamos en el directorio correcto
if [[ ! -f "Jenkinsfile" ]] || [[ ! -d "frontend" ]] || [[ ! -d "backend" ]]; then
    echo "Error: No se encuentra la estructura del proyecto esperada."
    echo "Asegúrate de ejecutar este script desde el directorio raíz del proyecto."
    exit 1
fi

echo "✅ Estructura del proyecto verificada"

echo ""
echo "🔧 Configurando Git..."

# Configurar Git si no está configurado
if [[ -z $(git config user.name) ]]; then
    read -p "Git user name: " GIT_NAME
    git config user.name "$GIT_NAME"
fi

if [[ -z $(git config user.email) ]]; then
    read -p "Git user email: " GIT_EMAIL
    git config user.email "$GIT_EMAIL"
fi

# Verificar si ya hay un repositorio remoto
if git remote get-url origin >/dev/null 2>&1; then
    echo "⚠️  Ya existe un remote origin configurado:"
    git remote -v
    read -p "¿Sobrescribir? (y/N): " OVERWRITE
    if [[ $OVERWRITE =~ ^[Yy]$ ]]; then
        git remote remove origin
    else
        echo "Manteniendo configuración existente."
        exit 0
    fi
fi

echo ""
echo "📤 Creando repositorio en GitHub..."

# Crear repositorio en GitHub
if gh repo create $REPO_NAME --public --source=. --remote=origin; then
    echo "✅ Repositorio creado exitosamente"
else
    echo "Error al crear repositorio. Es posible que ya exista."
    echo "Configurando remote manualmente..."
    git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git
fi

echo ""
echo "📝 Actualizando Jenkinsfile con configuración GitHub..."

# Backup del Jenkinsfile
cp Jenkinsfile Jenkinsfile.bak

# Actualizar URLs en Jenkinsfile
sed -i "s|tu-usuario|$GITHUB_USER|g" Jenkinsfile
sed -i "s|project_ci_cd|$REPO_NAME|g" Jenkinsfile

echo "✅ Jenkinsfile actualizado"

echo ""
echo "📦 Preparando commit inicial..."

# Verificar si hay cambios para commitear
if [[ -n $(git status --porcelain) ]]; then
    git add .
    git commit -m "feat: Configurar pipeline Jenkins con GitHub

- Jenkinsfile actualizado con configuración GitHub
- Scripts de setup incluidos
- Documentación de configuración añadida

Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
    
    echo "✅ Commit inicial creado"
else
    echo "No hay cambios para commitear"
fi

echo ""
echo "🚀 Subiendo código a GitHub..."

# Push al repositorio
git branch -M main
git push -u origin main

echo "✅ Código subido a GitHub"

echo ""
echo "🎉 Configuración completada exitosamente!"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1. 🔐 Configurar credenciales en Jenkins:"
echo "   - Ir a Jenkins → Manage Jenkins → Manage Credentials"
echo "   - Crear credencial con ID: 'github-credentials'"
echo "   - Username: $GITHUB_USER"
echo "   - Password: Tu GitHub Personal Access Token"
echo ""
echo "2. 🔗 Configurar webhook en GitHub (opcional):"
echo "   - Ir a: https://github.com/$GITHUB_USER/$REPO_NAME/settings/hooks"
echo "   - Add webhook: http://TU-JENKINS-SERVER/github-webhook/"
echo ""
echo "3. ▶️  Ejecutar pipeline en Jenkins:"
echo "   - Crear nuevo job tipo 'Pipeline'"
echo "   - SCM: Git → https://github.com/$GITHUB_USER/$REPO_NAME.git"
echo "   - Script path: Jenkinsfile"
echo ""
echo "🌐 URLs importantes:"
echo "   Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
echo "   Setup docs: JENKINS_GITHUB_SETUP.md"
echo ""
echo "💡 Para más detalles, revisa: JENKINS_GITHUB_SETUP.md"