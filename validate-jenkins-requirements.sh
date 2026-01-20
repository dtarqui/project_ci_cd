#!/bin/bash

# Script de verificación de requirements para Jenkins
# Ejecuta esto ANTES de poner el proyecto en Jenkins

echo "========================================"
echo "Validación de Requirements para Jenkins"
echo "========================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES=0

# Función para checkear comando
check_command() {
    if command -v $1 &> /dev/null; then
        VERSION=$($1 $2 2>&1 | head -1)
        echo -e "${GREEN}✓${NC} $1: $VERSION"
        return 0
    else
        echo -e "${RED}✗${NC} $1: NO ENCONTRADO"
        ISSUES=$((ISSUES + 1))
        return 1
    fi
}

# Función para checkear directorio
check_directory() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directorio: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Directorio NO EXISTE: $1"
        ISSUES=$((ISSUES + 1))
        return 1
    fi
}

# Función para checkear archivo
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Archivo: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Archivo NO EXISTE: $1"
        ISSUES=$((ISSUES + 1))
        return 1
    fi
}

echo "1. HERRAMIENTAS REQUERIDAS"
echo "=========================="
check_command "node" "--version"
check_command "npm" "--version"
check_command "git" "--version"
check_command "curl" "--version"

echo ""
echo "2. ESTRUCTURA DEL PROYECTO"
echo "=========================="
check_directory "frontend"
check_directory "backend"
check_directory "frontend/src"
check_directory "backend"

echo ""
echo "3. ARCHIVOS CRÍTICOS"
echo "===================="
check_file "Jenkinsfile"
check_file "frontend/package.json"
check_file "backend/package.json"
check_file "README.md"

echo ""
echo "4. DEPENDENCIAS NPM"
echo "==================="

# Verificar frontend package.json
echo ""
echo "Frontend:"
if [ -f "frontend/package.json" ]; then
    # Verificar scripts requeridos
    if grep -q '"test"' frontend/package.json; then
        echo -e "${GREEN}✓${NC} npm test script existe"
    else
        echo -e "${YELLOW}⚠${NC} npm test script NO encontrado"
    fi
    
    if grep -q '"build"' frontend/package.json; then
        echo -e "${GREEN}✓${NC} npm build script existe"
    else
        echo -e "${YELLOW}⚠${NC} npm build script NO encontrado"
    fi
fi

# Verificar backend package.json
echo ""
echo "Backend:"
if [ -f "backend/package.json" ]; then
    if grep -q '"test"' backend/package.json; then
        echo -e "${GREEN}✓${NC} npm test script existe"
    else
        echo -e "${YELLOW}⚠${NC} npm test script NO encontrado"
    fi
fi

echo ""
echo "5. CONFIGURACIÓN GIT"
echo "===================="

# Verificar remote origin
if git remote get-url origin &> /dev/null; then
    ORIGIN=$(git remote get-url origin)
    if [[ $ORIGIN == *"dtarqui"* ]] || [[ $ORIGIN == *"project_ci_cd"* ]]; then
        echo -e "${GREEN}✓${NC} Git remote origin: $ORIGIN"
    else
        echo -e "${YELLOW}⚠${NC} Git remote: $ORIGIN (verifica que sea correcto)"
    fi
else
    echo -e "${RED}✗${NC} Git remote NO configurado"
    ISSUES=$((ISSUES + 1))
fi

# Verificar branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${GREEN}✓${NC} Branch actual: $CURRENT_BRANCH"

echo ""
echo "6. INSTALACIÓN DE DEPENDENCIAS"
echo "=============================="

# Verificar que node_modules NO existan (se instalarán en Jenkins)
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓${NC} frontend/node_modules no existe (correcto para Jenkins)"
else
    echo -e "${YELLOW}⚠${NC} frontend/node_modules existe (Jenkins lo reinstalará)"
fi

if [ ! -d "backend/node_modules" ]; then
    echo -e "${GREEN}✓${NC} backend/node_modules no existe (correcto para Jenkins)"
else
    echo -e "${YELLOW}⚠${NC} backend/node_modules existe (Jenkins lo reinstalará)"
fi

echo ""
echo "7. ARCHIVOS DE CONFIGURACIÓN"
echo "============================="
check_file "frontend/package.json"
check_file "frontend/jest.config.js"
check_file "backend/package.json"
check_file "backend/jest.config.js"

if [ -f "backend/Dockerfile" ]; then
    echo -e "${GREEN}✓${NC} Dockerfile encontrado (Docker builds habilitado)"
else
    echo -e "${YELLOW}⚠${NC} Dockerfile NO encontrado (Docker builds serán saltados)"
fi

echo ""
echo "8. TESTS LOCALES (VALIDACIÓN)"
echo "============================="
echo ""
echo "Ejecutando tests localmente para validar configuración..."

if [ -d "backend" ]; then
    echo ""
    echo "Backend tests:"
    cd backend
    
    if [ -f "package.json" ]; then
        if npm test 2>/dev/null | grep -q "passed\|✓"; then
            echo -e "${GREEN}✓${NC} Backend tests pasan"
        else
            echo -e "${YELLOW}⚠${NC} Backend tests - verificar output"
        fi
    fi
    
    cd ..
fi

if [ -d "frontend" ]; then
    echo ""
    echo "Frontend tests:"
    cd frontend
    
    if [ -f "package.json" ]; then
        if npm test -- --listTests 2>/dev/null | grep -q "test"; then
            echo -e "${GREEN}✓${NC} Frontend tests encontrados"
        else
            echo -e "${YELLOW}⚠${NC} Frontend tests - verificar configuración"
        fi
    fi
    
    cd ..
fi

echo ""
echo "========================================"
echo "RESUMEN"
echo "========================================"

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}Todos los checks pasaron!${NC}"
    echo ""
    echo "Tu proyecto está listo para Jenkins:"
    echo "1. Configura Jenkins siguiendo: JENKINS_SETUP_GUIA.md"
    echo "2. Crea un Pipeline job"
    echo "3. URL: https://github.com/dtarqui/project_ci_cd.git"
    echo "4. Jenkinsfile path: Jenkinsfile"
    echo "5. Branch: */main"
    echo ""
    echo "Listo! Ejecuta 'Build Now' en Jenkins"
else
    echo -e "${RED}$ISSUES issue(s) encontrado(s)${NC}"
    echo ""
    echo "Acciones recomendadas:"
    echo "1. Instala las herramientas faltantes"
    echo "2. Verifica que los archivos existan"
    echo "3. Verifica la configuración de Git"
    echo "4. Ejecuta 'npm install' en frontend y backend localmente"
fi

echo ""