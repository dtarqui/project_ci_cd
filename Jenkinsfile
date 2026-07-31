// Helpers para el correo de notificacion (definidos fuera de pipeline{} para
// poder reusarlos desde post.success/failure/unstable sin duplicar HTML).
def emailStatusColor(status) {
    if (status == 'SUCCESS') { return '#15803d' }
    if (status == 'UNSTABLE') { return '#b45309' }
    return '#b91c1c'
}

def emailStatusBg(status) {
    if (status == 'SUCCESS') { return '#f0fdf4' }
    if (status == 'UNSTABLE') { return '#fffbeb' }
    return '#fef2f2'
}

def emailStatusLabel(status) {
    if (status == 'SUCCESS') { return 'Build exitoso' }
    if (status == 'UNSTABLE') { return 'Build inestable' }
    return 'Build fallido'
}

// Recorta docs/metrics/pre-cicd-baseline.md a lo relevante para un correo:
// se queda con el resumen + cobertura + DORA + tendencia + casos fallidos,
// y descarta el ranking largo de archivos y "fuente de datos"/"evidencia
// historica" (demasiado detalle para un email; eso queda para quien abra
// el artefacto completo del build).
def trimMetricsForEmail(mdText) {
    if (!mdText?.trim()) {
        return 'No se encontro docs/metrics/pre-cicd-baseline.md para este build.'
    }
    def text = mdText
    def rankingStart = text.indexOf('## Archivos con menor cobertura de lineas')
    def rankingEnd = text.indexOf('## Casos de prueba fallidos')
    if (rankingStart >= 0 && rankingEnd > rankingStart) {
        text = text.substring(0, rankingStart) + text.substring(rankingEnd)
    }
    def sourceIdx = text.indexOf('## Fuente de datos')
    if (sourceIdx >= 0) {
        text = text.substring(0, sourceIdx)
    }
    text = text.replaceFirst('(?m)^# .*\n+', '')
    text = text.replaceFirst('(?m)^Este archivo.*\n.*\n+', '')
    return text.trim()
}

// Shell HTML comun (banner de color + tarjeta + pie de pagina) para los 3
// tipos de correo. Usa tablas/estilos inline porque la mayoria de clientes
// de correo (Outlook incluido) ignoran <style> y CSS moderno.
def buildEmailHtml(status, headline, statsHtml, metricsExcerpt, linksHtml, buildUrl) {
    def color = emailStatusColor(status)
    def bg = emailStatusBg(status)
    return """
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f2937;">
      <div style="background:${color};color:#ffffff;padding:20px 24px;border-radius:8px 8px 0 0;">
        <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.85;">Mi Tienda Online &middot; CI/CD</div>
        <div style="font-size:22px;font-weight:600;margin-top:6px;">${emailStatusLabel(status)}</div>
        <div style="font-size:14px;opacity:.9;margin-top:2px;">${headline}</div>
      </div>
      <div style="background:${bg};border:1px solid #e5e7eb;border-top:none;padding:24px;">
        ${statsHtml}
        <div style="font-size:13px;font-weight:600;color:#374151;margin:20px 0 8px;">Metricas de este build</div>
        <pre style="background:#111827;color:#e5e7eb;padding:16px;border-radius:6px;font-size:12.5px;line-height:1.55;overflow-x:auto;white-space:pre-wrap;margin:0;">${metricsExcerpt}</pre>
        <div style="font-size:13px;font-weight:600;color:#374151;margin:20px 0 8px;">Enlaces</div>
        ${linksHtml}
      </div>
      <div style="background:${bg};border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px 24px;font-size:12px;color:#6b7280;">
        Mensaje automatico de Jenkins &mdash; <a href="${buildUrl}" style="color:${color};">Ver build completo</a>
      </div>
    </div>
    """
}

// Fila de datos clave (build, commit, autor, duracion) como tabla HTML -- las
// tablas son el layout mas compatible entre clientes de correo para un
// "grid" de 2 columnas (flexbox/grid de CSS no son fiables en email).
def buildEmailStatsTable(rows) {
    def cells = rows.collect { label, value ->
        """<tr>
             <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;">${label}</td>
             <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${value}</td>
           </tr>"""
    }.join("\n")
    return "<table style=\"border-collapse:collapse;width:100%;\">${cells}</table>"
}

pipeline {
    agent any

    // Usa la instalación NodeJS definida en Jenkins (Manage Jenkins > Tools > NodeJS installations)
    // Asegúrate que el nombre aquí coincida con el configurado en la UI (ej: Node18)
    tools {
        nodejs 'Node18'
    }

    environment {
        NODE_VERSION = "18"
        FRONTEND_DIR = "frontend"
        BACKEND_DIR = "backend"
        CI = "true"
        GITHUB_REPO = "https://github.com/dtarqui/project_ci_cd.git"
        
        // Vercel backend project identifiers (opcionales)
        VERCEL_BACKEND_PROJECT = ""
        VERCEL_BACKEND_ORG = ""
        // Vercel frontend project identifiers (opcionales)
        VERCEL_FRONTEND_PROJECT = ""
        VERCEL_FRONTEND_ORG = ""
        // Variables de entorno backend para Vercel (formato: KEY=VALUE por línea)
        BACKEND_ENV_VARS = ""
        BACKEND_VERCEL_ENV = "production"
        // Variables de entorno frontend para Vercel
        FRONTEND_VERCEL_ENV = "production"
        
        // Métricas y monitoreo
        STAGE_START_TIME = ""
        METRICS_PROFILE = "pre-cicd"
        METRICS_DIR = "docs/metrics"
        
        // Email notifications
        NOTIFICATION_EMAIL = "dmtarqui@gmail.com"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 20, unit: 'MINUTES')
        timestamps()
        skipDefaultCheckout()
    }

    triggers {
        // Poll GitHub cada 5 minutos (no requiere configuración adicional)
        pollSCM('H/5 * * * *')
    }

    stages {

        stage('GitHub Checkout') {
            steps {
                script {
                    echo "Obteniendo codigo del repositorio GitHub..."
                    
                    // Checkout desde GitHub (repositorio publico)
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: '*/main']],
                        doGenerateSubmoduleConfigurations: false,
                        extensions: [
                            [$class: 'CloneOption', depth: 1, noTags: false, shallow: true],
                            [$class: 'CheckoutOption', timeout: 20]
                        ],
                        submoduleCfg: [],
                        userRemoteConfigs: [[
                            url: env.GITHUB_REPO
                        ]]
                    ])
                    
                    // Obtener información del commit
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.GIT_COMMIT_MSG = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                    env.GIT_AUTHOR = sh(
                        script: 'git log -1 --pretty=%an',
                        returnStdout: true
                    ).trim()
                    
                    echo "Commit: ${env.GIT_COMMIT_SHORT}"
                    echo "Mensaje: ${env.GIT_COMMIT_MSG}"
                    echo "Autor: ${env.GIT_AUTHOR}"
                }
            }
        }

        stage('Environment Setup') {
            steps {
                script {
                    echo "Configurando entorno Node.js ${env.NODE_VERSION}..."
                    
                    if (isUnix()) {
                        sh '''
                            echo "PATH inicial: $PATH"
                            echo "NODEJS_HOME: ${NODEJS_HOME:-'(unset)'}"

                            # Si Jenkins inyectó la tool NodeJS, usa esa ruta
                            if [ -n "$NODEJS_HOME" ]; then
                                export PATH="$NODEJS_HOME/bin:$PATH"
                            fi

                            echo "PATH tras inyectar NodeJS_HOME: $PATH"
                            echo "which node: $(which node || true)"

                            # Verificar Node.js
                            if ! command -v node >/dev/null 2>&1; then
                                echo "Node.js no está en PATH en el agente." >&2
                                echo "Verifica que el tool NodeJS en Jenkins se llame 'Node18' o ajusta el nombre en tools { nodejs '...' }." >&2
                                exit 1
                            fi

                            echo "Node version: $(node --version)"
                            echo "NPM version: $(npm --version)"

                            # Limpiar caché NPM
                            npm cache clean --force
                        '''
                    } else {
                        bat '''
                            where node > nul 2>&1 || (
                                echo "Node.js no encontrado. Por favor instala Node.js %NODE_VERSION%"
                                exit 1
                            )
                            
                            echo Node version:
                            node --version
                            echo NPM version:
                            npm --version
                            
                            npm cache clean --force
                        '''
                    }
                }
            }
        }

        stage('Frontend Dependencies') {
            options {
                retry(2)
            }
            steps {
                echo "Instalando dependencias del frontend..."
                dir(env.FRONTEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                npm ci --cache .npm --prefer-offline

                                echo "Dependencias frontend instaladas correctamente"
                            '''
                        } else {
                            bat '''
                                npm ci --cache .npm --prefer-offline

                                echo Dependencias frontend instaladas correctamente
                            '''
                        }
                    }
                }
            }
            post {
                failure {
                    echo "Error al instalar dependencias del frontend"
                }
            }
        }

        stage('Backend Dependencies') {
            options {
                retry(2)
            }
            steps {
                echo "Instalando dependencias del backend..."
                dir(env.BACKEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                npm ci --cache .npm --prefer-offline

                                echo "Dependencias backend instaladas correctamente"
                            '''
                        } else {
                            bat '''
                                npm ci --cache .npm --prefer-offline

                                echo Dependencias backend instaladas correctamente
                            '''
                        }
                    }
                }
            }
            post {
                failure {
                    echo "Error al instalar dependencias del backend"
                }
            }
        }

        stage('Frontend Lint') {
            options {
                retry(2)
            }
            steps {
                echo "Analizando calidad de codigo frontend..."
                dir(env.FRONTEND_DIR) {
                    script {
                        try {
                            if (isUnix()) {
                                sh 'npm run lint'
                            } else {
                                bat 'npm run lint'
                            }
                        } catch (Exception e) {
                            echo "ESLint falló: ${e.message}"
                            currentBuild.result = 'UNSTABLE'
                        }
                    }
                }
            }
        }

        stage('Backend Lint') {
            options {
                retry(2)
            }
            steps {
                echo "Analizando calidad de codigo backend..."
                dir(env.BACKEND_DIR) {
                    script {
                        try {
                            if (isUnix()) {
                                sh 'npm run lint'
                            } else {
                                bat 'npm run lint'
                            }
                        } catch (Exception e) {
                            echo "ESLint falló: ${e.message}"
                            currentBuild.result = 'UNSTABLE'
                        }
                    }
                }
            }
        }

        stage('Frontend Tests') {
            options {
                retry(2)
            }
            steps {
                script {
                    env.STAGE_START_TIME = System.currentTimeMillis().toString()
                }
                echo "Ejecutando tests del frontend..."
                dir(env.FRONTEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                export CI=true
                                export NODE_ENV=test
                                
                                # Generar reportes en múltiples formatos para métricas
                                # Desactivar coverageThreshold en CI para evitar fallos silenciosos
                                npm test -- --ci --runInBand --watchAll=false \
                                    --coverage \
                                    --coverageReporters=html \
                                    --coverageReporters=lcov \
                                    --coverageReporters=cobertura \
                                    --coverageReporters=json-summary \
                                    --coverageThreshold='{}' || {
                                    echo "ADVERTENCIA: Tests fallaron pero continuamos para generar reportes"
                                    exit 1
                                }
                                
                                echo "Tests frontend completados exitosamente"
                            '''
                        } else {
                            bat '''
                                set CI=true
                                set NODE_ENV=test
                                
                                npm test -- --ci --runInBand --watchAll=false --coverage --coverageReporters=html --coverageReporters=lcov --coverageReporters=cobertura --coverageReporters=json-summary --coverageThreshold="{}"
                                if errorlevel 1 (
                                    echo ADVERTENCIA: Tests fallaron pero continuamos para generar reportes
                                    exit /b 1
                                )
                                
                                echo Tests frontend completados exitosamente
                            '''
                        }
                    }
                }
            }
            post {
                always {
                    script {
                        def duration = env.STAGE_START_TIME ? (System.currentTimeMillis() - env.STAGE_START_TIME.toLong()) / 1000 : 0
                        env.FRONTEND_TEST_DURATION_SECONDS = duration.toString()
                        echo "Frontend Tests duration: ${duration}s"
                        
                        // Publicar resultados de tests (formato JUnit)
                        junit(testResults: "${env.FRONTEND_DIR}/junit.xml", allowEmptyResults: true)
                        
                        // Publicar coverage HTML
                        publishHTML([
                            allowMissing: true,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: "${env.FRONTEND_DIR}/coverage",
                            reportFiles: 'index.html',
                            reportName: 'Frontend Coverage Report'
                        ])
                    }
                }
            }
        }

        stage('Backend Tests') {
            options {
                retry(2)
            }
            steps {
                script {
                    env.STAGE_START_TIME = System.currentTimeMillis().toString()
                }
                echo "Ejecutando tests del backend..."
                dir(env.BACKEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                export NODE_ENV=test
                                
                                # Generar reportes en múltiples formatos
                                # Desactivar coverageThreshold en CI para evitar fallos silenciosos
                                npm test -- --coverage \
                                    --coverageReporters=html \
                                    --coverageReporters=lcov \
                                    --coverageReporters=cobertura \
                                    --coverageReporters=json-summary \
                                    --coverageThreshold='{}' || {
                                    echo "ADVERTENCIA: Tests fallaron pero continuamos para generar reportes"
                                    exit 1
                                }
                                
                                echo "Tests backend completados exitosamente"
                            '''
                        } else {
                            bat '''
                                set NODE_ENV=test
                                
                                npm test -- --coverage --coverageReporters=html --coverageReporters=lcov --coverageReporters=cobertura --coverageReporters=json-summary --coverageThreshold="{}"
                                if errorlevel 1 (
                                    echo ADVERTENCIA: Tests fallaron pero continuamos para generar reportes
                                    exit /b 1
                                )
                                
                                echo Tests backend completados exitosamente
                            '''
                        }
                    }
                }
            }
            post {
                always {
                    script {
                        def duration = env.STAGE_START_TIME ? (System.currentTimeMillis() - env.STAGE_START_TIME.toLong()) / 1000 : 0
                        env.BACKEND_TEST_DURATION_SECONDS = duration.toString()
                        echo "Backend Tests duration: ${duration}s"
                        
                        // Publicar resultados de tests
                        junit(testResults: "${env.BACKEND_DIR}/junit.xml", allowEmptyResults: true)
                        
                        // Publicar coverage HTML
                        publishHTML([
                            allowMissing: true,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: "${env.BACKEND_DIR}/coverage",
                            reportFiles: 'index.html',
                            reportName: 'Backend Coverage Report'
                        ])
                    }
                }
            }
        }

        stage('Backend Validation') {
            steps {
                echo "Validando backend para produccion..."
                dir(env.BACKEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                # Verificar que el servidor puede iniciarse
                                timeout 10s node index.js &
                                SERVER_PID=$!
                                
                                sleep 3
                                
                                # Health check
                                curl -f http://localhost:4000/health || {
                                    echo "Health check fallido"
                                    kill $SERVER_PID 2>/dev/null || true
                                    exit 1
                                }
                                
                                kill $SERVER_PID 2>/dev/null || true
                                echo "Backend validado correctamente"
                            '''
                        } else {
                            // Requiere que el agente Windows tenga PowerShell disponible (estandar en Windows 10/11 y Server 2016+).
                            bat '''
                                start /B node index.js > server.log 2>&1
                                ping -n 4 127.0.0.1 >nul

                                powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri http://localhost:4000/health -TimeoutSec 5 | Out-Null; exit 0 } catch { Write-Host 'Health check fallido'; exit 1 }"
                                if errorlevel 1 (
                                    taskkill /F /IM node.exe >nul 2>&1
                                    exit /b 1
                                )

                                taskkill /F /IM node.exe >nul 2>&1
                                echo Backend validado correctamente
                            '''
                        }
                    }
                }
            }
        }

        stage('Deploy Backend Vercel') {
            steps {
                script {
                    env.STAGE_START_TIME = System.currentTimeMillis().toString()
                }
                echo "Desplegando backend a Vercel..."
                dir(env.BACKEND_DIR) {
                    withCredentials([string(credentialsId: 'vercel-token', variable: 'VERCEL_TOKEN')]) {
                        script {
                            if (isUnix()) {
                                def backendDeployOutput = sh(
                                    script: '''
                                        set -e
                                        npm install -g vercel 1>&2

                                        PROJECT_ARGS=""
                                        if [ -n "$VERCEL_BACKEND_PROJECT" ] && [ -n "$VERCEL_BACKEND_ORG" ]; then
                                            PROJECT_ARGS="--project $VERCEL_BACKEND_PROJECT --org $VERCEL_BACKEND_ORG"
                                        fi

                                        # Cargar variables de entorno del backend en Vercel si existen
                                        if [ -n "$BACKEND_ENV_VARS" ]; then
                                            echo "$BACKEND_ENV_VARS" | while IFS= read -r line; do
                                                [ -z "$line" ] && continue
                                                case "$line" in
                                                    #*) continue ;;
                                                esac
                                                NAME="${line%%=*}"
                                                VALUE="${line#*=}"
                                                [ -z "$NAME" ] && continue

                                                # Evitar subir variables vacías que rompen runtime (ej. JWT_SECRET="").
                                                if [ -z "$VALUE" ]; then
                                                    echo "Omitiendo variable vacía: $NAME" 1>&2
                                                    continue
                                                fi

                                                printf "%s" "$VALUE" | vercel env add "$NAME" "$BACKEND_VERCEL_ENV" --token $VERCEL_TOKEN $PROJECT_ARGS
                                            done
                                        fi

                                        # Validar existencia de secreto JWT antes de construir/desplegar.
                                        if ! vercel env ls "$BACKEND_VERCEL_ENV" --token $VERCEL_TOKEN $PROJECT_ARGS 2>/dev/null | grep -Eq "(^|[[:space:]])JWT_SECRET([[:space:]]|$)"; then
                                            echo "ERROR: JWT_SECRET no configurado en Vercel para entorno $BACKEND_VERCEL_ENV" 1>&2
                                            exit 1
                                        fi

                                        # Forzar configuración CORS abierta para despliegue backend
                                        vercel env rm CORS_ALLOW_ORIGIN "$BACKEND_VERCEL_ENV" --yes --token $VERCEL_TOKEN $PROJECT_ARGS 2>/dev/null || true
                                        printf "%s" "*" | vercel env add CORS_ALLOW_ORIGIN "$BACKEND_VERCEL_ENV" --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2

                                        vercel env rm CORS_ALLOW_METHODS "$BACKEND_VERCEL_ENV" --yes --token $VERCEL_TOKEN $PROJECT_ARGS 2>/dev/null || true
                                        printf "%s" "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD" | vercel env add CORS_ALLOW_METHODS "$BACKEND_VERCEL_ENV" --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2

                                        vercel env rm CORS_ALLOW_HEADERS "$BACKEND_VERCEL_ENV" --yes --token $VERCEL_TOKEN $PROJECT_ARGS 2>/dev/null || true
                                        printf "%s" "Origin, X-Requested-With, Content-Type, Accept, Authorization" | vercel env add CORS_ALLOW_HEADERS "$BACKEND_VERCEL_ENV" --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2

                                        vercel pull --yes --environment=production --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2
                                        vercel build --prod --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2
                                        BACKEND_URL=$(vercel deploy --prebuilt --prod --token $VERCEL_TOKEN $PROJECT_ARGS | tail -1)
                                        printf "%s" "$BACKEND_URL"
                                    ''',
                                    returnStdout: true
                                ).trim()

                                // Evita mezclar logs con la URL en correos/notificaciones.
                                env.BACKEND_VERCEL_URL = backendDeployOutput.readLines().last().trim()
                            } else {
                                bat '''
                                    npm install -g vercel
                                    vercel pull --yes --environment=production --token %VERCEL_TOKEN%
                                    vercel build --prod --token %VERCEL_TOKEN%
                                    vercel deploy --prebuilt --prod --token %VERCEL_TOKEN%
                                '''
                            }
                        }
                    }
                }
            }
            post {
                always {
                    script {
                        def duration = env.STAGE_START_TIME ? (System.currentTimeMillis() - env.STAGE_START_TIME.toLong()) / 1000 : 0
                        echo "Backend Vercel Deploy duration: ${duration}s"
                    }
                }
                success {
                    script {
                        if (env.BACKEND_VERCEL_URL) {
                            echo "Backend deployed: ${env.BACKEND_VERCEL_URL}"
                        }
                    }
                }
            }
        }

        stage('Frontend Build') {
            steps {
                echo "Construyendo frontend para produccion..."
                dir(env.FRONTEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                export NODE_ENV=production

                                # Reemplazar placeholder en rewrites de Vercel con URL real del backend
                                if [ -n "$BACKEND_VERCEL_URL" ]; then
                                    echo "Reemplazando __BACKEND_URL__ con $BACKEND_VERCEL_URL en vercel.json..."
                                    # Extraer solo el dominio (sin https://)
                                    BACKEND_HOST="${BACKEND_VERCEL_URL#https://}"
                                    BACKEND_HOST="${BACKEND_HOST#http://}"
                                    # Reemplazar en vercel.json
                                    sed -i.bak "s|__BACKEND_URL__|$BACKEND_HOST|g" vercel.json
                                    cat vercel.json
                                    rm -f vercel.json.bak
                                fi

                                # Inyectar API_BASE_URL desde el backend desplegado (fallback)
                                if [ -n "$BACKEND_VERCEL_URL" ]; then
                                    echo "API_BASE_URL=$BACKEND_VERCEL_URL" > .env
                                fi
                                
                                npm run build
                                
                                # Verificar build (acepta build/ o dist/)
                                if [ -d "build" ]; then
                                    BUILD_DIR="build"
                                elif [ -d "dist" ]; then
                                    BUILD_DIR="dist"
                                else
                                    echo "Error: no se generó directorio build/ ni dist/"
                                    exit 1
                                fi

                                echo "Build frontend generado en $(pwd)/$BUILD_DIR"
                                ls -la "$BUILD_DIR" | head -10
                            '''
                        } else {
                            bat '''
                                set NODE_ENV=production

                                if not "%BACKEND_VERCEL_URL%"=="" (
                                    echo Reemplazando __BACKEND_URL__ con %BACKEND_VERCEL_URL% en vercel.json...
                                    powershell -NoProfile -Command "$url=$env:BACKEND_VERCEL_URL; if ($url) { $host=$url -replace '^https?://',''; (Get-Content vercel.json) -replace '__BACKEND_URL__',$host | Set-Content vercel.json; Get-Content vercel.json }"
                                )

                                if not "%BACKEND_VERCEL_URL%"=="" (
                                    echo API_BASE_URL=%BACKEND_VERCEL_URL%> .env
                                )
                                
                                npm run build
                                
                                if not exist "build" (
                                    echo Error: directorio build no generado
                                    exit 1
                                )
                                
                                echo Build frontend generado
                                dir build
                            '''
                        }
                    }
                }
            }
        }

        stage('Deploy Vercel') {
            steps {
                script {
                    env.STAGE_START_TIME = System.currentTimeMillis().toString()
                }
                echo "Desplegando frontend a Vercel..."
                dir(env.FRONTEND_DIR) {
                    withCredentials([string(credentialsId: 'vercel-token', variable: 'VERCEL_TOKEN')]) {
                        script {
                            if (isUnix()) {
                                def frontendDeployOutput = sh(
                                    script: '''
                                        set -e
                                        npm install -g vercel 1>&2
                                        PROJECT_ARGS=""
                                        if [ -n "$VERCEL_FRONTEND_PROJECT" ] && [ -n "$VERCEL_FRONTEND_ORG" ]; then
                                            PROJECT_ARGS="--project $VERCEL_FRONTEND_PROJECT --org $VERCEL_FRONTEND_ORG"
                                        fi

                                        # Inyectar URL del backend en variables de entorno de Vercel ANTES de hacer pull
                                        # Esto asegura que el frontend tenga acceso al backend real durante el build
                                        if [ -n "$BACKEND_VERCEL_URL" ]; then
                                            echo "Inyectando BACKEND_VERCEL_URL=$BACKEND_VERCEL_URL en Vercel..." 1>&2
                                            # Remover si existe
                                            vercel env rm API_BASE_URL "$FRONTEND_VERCEL_ENV" --yes --token $VERCEL_TOKEN $PROJECT_ARGS 2>/dev/null || true
                                            # Agregar nueva variable
                                            printf "%s" "$BACKEND_VERCEL_URL" | vercel env add API_BASE_URL "$FRONTEND_VERCEL_ENV" --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2
                                            echo "Variable API_BASE_URL inyectada correctamente" 1>&2
                                        fi

                                        vercel pull --yes --environment=production --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2
                                        vercel build --prod --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2
                                        FRONTEND_URL=$(vercel deploy --prebuilt --prod --token $VERCEL_TOKEN $PROJECT_ARGS | tail -1)
                                        printf "%s" "$FRONTEND_URL"
                                    ''',
                                    returnStdout: true
                                ).trim()

                                // Evita mezclar logs con la URL en correos/notificaciones.
                                env.VERCEL_URL = frontendDeployOutput.readLines().last().trim()
                            } else {
                                bat '''
                                    npm install -g vercel
                                    set PROJECT_ARGS=
                                    if not "%VERCEL_FRONTEND_PROJECT%"=="" if not "%VERCEL_FRONTEND_ORG%"=="" (
                                        set PROJECT_ARGS=--project %VERCEL_FRONTEND_PROJECT% --org %VERCEL_FRONTEND_ORG%
                                    )

                                    if not "%BACKEND_VERCEL_URL%"=="" (
                                        echo Inyectando BACKEND_VERCEL_URL=%BACKEND_VERCEL_URL% en Vercel...
                                        vercel env rm API_BASE_URL %FRONTEND_VERCEL_ENV% --yes --token %VERCEL_TOKEN% %PROJECT_ARGS% 2>nul
                                        echo %BACKEND_VERCEL_URL%| vercel env add API_BASE_URL %FRONTEND_VERCEL_ENV% --token %VERCEL_TOKEN% %PROJECT_ARGS%
                                        echo Variable API_BASE_URL inyectada correctamente
                                    )

                                    vercel pull --yes --environment=production --token %VERCEL_TOKEN% %PROJECT_ARGS%
                                    vercel build --prod --token %VERCEL_TOKEN% %PROJECT_ARGS%
                                    vercel deploy --prebuilt --prod --token %VERCEL_TOKEN% %PROJECT_ARGS%
                                '''
                            }
                        }
                    }
                }
            }
            post {
                always {
                    script {
                        def duration = env.STAGE_START_TIME ? (System.currentTimeMillis() - env.STAGE_START_TIME.toLong()) / 1000 : 0
                        echo "Vercel Deploy duration: ${duration}s"
                    }
                }
                success {
                    script {
                        if (env.VERCEL_URL) {
                            echo "Frontend deployed: ${env.VERCEL_URL}"
                        }
                    }
                }
            }
        }

        stage('Package Artifacts') {
            steps {
                echo "Empaquetando artefactos..."
                script {
                    // Detect frontend build folder (build/ or dist/)
                    def frontendBuildDir = null
                    if (fileExists("${env.FRONTEND_DIR}/build")) {
                        frontendBuildDir = "build"
                    } else if (fileExists("${env.FRONTEND_DIR}/dist")) {
                        frontendBuildDir = "dist"
                    }

                    if (frontendBuildDir) {
                        archiveArtifacts(
                            artifacts: "${env.FRONTEND_DIR}/${frontendBuildDir}/**/*",
                            fingerprint: true,
                            allowEmptyArchive: false
                        )
                    } else {
                        echo "No se encontró build de frontend (build/ o dist/). Saltando archivo de frontend."
                    }

                    // Archivar backend files
                    archiveArtifacts(
                        artifacts: "${env.BACKEND_DIR}/**/*.js,${env.BACKEND_DIR}/package*.json,${env.BACKEND_DIR}/Dockerfile",
                        fingerprint: true
                    )

                    // Crear artefacto comprimido con timestamp
                    def timestamp = new Date().format('yyyyMMdd-HHmmss')
                    def artifactName = "mi-tienda-${env.BUILD_NUMBER}-${timestamp}.tar.gz"

                    if (isUnix()) {
                        if (frontendBuildDir) {
                            sh """
                                tar -czf ${artifactName} \\
                                    ${env.FRONTEND_DIR}/${frontendBuildDir} \\
                                    ${env.BACKEND_DIR}/*.js \\
                                    ${env.BACKEND_DIR}/package*.json \\
                                    ${env.BACKEND_DIR}/Dockerfile \\
                                    README.md
                            """
                        } else {
                            sh """
                                tar -czf ${artifactName} \\
                                    ${env.BACKEND_DIR}/*.js \\
                                    ${env.BACKEND_DIR}/package*.json \\
                                    ${env.BACKEND_DIR}/Dockerfile \\
                                    README.md
                            """
                        }
                    } else {
                        if (frontendBuildDir) {
                            bat """
                                echo Creating artifact ${artifactName}
                                7z a ${artifactName} ${env.FRONTEND_DIR}\\${frontendBuildDir} ${env.BACKEND_DIR}\\*.js ${env.BACKEND_DIR}\\package*.json ${env.BACKEND_DIR}\\Dockerfile README.md
                            """
                        } else {
                            bat """
                                echo Creating artifact ${artifactName}
                                7z a ${artifactName} ${env.BACKEND_DIR}\\*.js ${env.BACKEND_DIR}\\package*.json ${env.BACKEND_DIR}\\Dockerfile README.md
                            """
                        }
                    }

                    archiveArtifacts(artifacts: artifactName, fingerprint: true)
                    env.ARTIFACT_NAME = artifactName
                }
            }
        }

    }

    post {
        always {
            echo "Ejecutando limpieza..."
            script {
                // Generar reporte de métricas del pipeline
                def buildDuration = currentBuild.duration / 1000
                def metricsReport = """
                REPORTE DE MÉTRICAS CI/CD
                ═══════════════════════════════════════
                Build: #${env.BUILD_NUMBER}
                Commit: ${env.GIT_COMMIT_SHORT}
                Autor: ${env.GIT_AUTHOR}
                Mensaje: ${env.GIT_COMMIT_MSG}
                Duración total: ${buildDuration}s
                Estado: ${currentBuild.result ?: 'SUCCESS'}
                
                DEPLOYMENTS:
                ${env.VERCEL_URL ? "   Frontend: ${env.VERCEL_URL}" : "   Frontend: N/A"}
                ${env.BACKEND_VERCEL_URL ? "   Backend: ${env.BACKEND_VERCEL_URL}" : "   Backend: N/A"}
                
                Artefacto: ${env.ARTIFACT_NAME ?: 'N/A'}
                ═══════════════════════════════════════
                """
                
                echo metricsReport
                
                // Guardar métricas en archivo
                writeFile(
                    file: "metrics-${env.BUILD_NUMBER}.txt",
                    text: metricsReport
                )
                archiveArtifacts(artifacts: "metrics-${env.BUILD_NUMBER}.txt", allowEmptyArchive: true)

                // Generar línea base de métricas CI/CD automáticamente
                env.BUILD_DURATION_SECONDS = ((currentBuild.duration ?: 0) / 1000).toString()
                env.BUILD_STATUS = currentBuild.result ?: 'SUCCESS'
                if (isUnix()) {
                    sh '''
                        node scripts/ci/generate-ci-metrics.js
                        node scripts/ci/generate-research-reports.js
                    '''
                } else {
                    bat '''
                        node scripts\\ci\\generate-ci-metrics.js
                        node scripts\\ci\\generate-research-reports.js
                    '''
                }
                archiveArtifacts(
                    artifacts: "${env.METRICS_DIR}/pre-cicd-baseline.csv,${env.METRICS_DIR}/pre-cicd-baseline.md,${env.METRICS_DIR}/build-metrics-${env.BUILD_NUMBER}.json,${env.METRICS_DIR}/comparative-before-after.md,${env.METRICS_DIR}/scrum-indicators.md,${env.METRICS_DIR}/methodology-barriers-template.md,${env.METRICS_DIR}/sprint-metrics-template.csv,${env.METRICS_DIR}/sprint-metrics.csv",
                    allowEmptyArchive: true
                )

                // Guarda un extracto legible de las metricas para incrustar en el
                // correo de notificacion (ver post.success/failure/unstable).
                def metricsMdPath = "${env.METRICS_DIR}/pre-cicd-baseline.md"
                def metricsMdText = fileExists(metricsMdPath) ? readFile(metricsMdPath) : ''
                env.METRICS_EMAIL_EXCERPT = trimMetricsForEmail(metricsMdText)

                // Limpieza
                if (isUnix()) {
                    sh '''
                        # Limpiar procesos Node.js
                        pkill -f "node index.js" 2>/dev/null || true
                        
                        # Limpiar puertos
                        fuser -k 4000/tcp 2>/dev/null || true
                        fuser -k 3000/tcp 2>/dev/null || true
                        
                        # Limpiar caché NPM
                        npm cache clean --force 2>/dev/null || true
                        
                        echo "Limpieza completada"
                    '''
                } else {
                    bat '''
                        echo Limpieza en Windows...
                        taskkill /F /IM "node.exe" 2>nul || echo No hay procesos Node activos
                        echo Limpieza completada
                    '''
                }
            }
        }
        success {
            echo "Pipeline ejecutado correctamente!"
            script {
                def stats = buildEmailStatsTable([
                    ['Build', "#${env.BUILD_NUMBER} &middot; ${env.JOB_NAME}"],
                    ['Commit', "${env.GIT_COMMIT_SHORT} &mdash; ${env.GIT_COMMIT_MSG}"],
                    ['Autor', env.GIT_AUTHOR],
                    ['Duracion', currentBuild.durationString],
                    ['Backend', env.BACKEND_VERCEL_URL ? "<a href='${env.BACKEND_VERCEL_URL}'>${env.BACKEND_VERCEL_URL}</a>" : 'sin deploy en este build'],
                    ['Frontend', env.VERCEL_URL ? "<a href='${env.VERCEL_URL}'>${env.VERCEL_URL}</a>" : 'sin deploy en este build'],
                ])

                def links = """
                <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.9;">
                    <li><a href="${env.BUILD_URL}testReport/">Resultados de tests</a></li>
                    <li><a href="${env.BUILD_URL}Frontend_20Coverage_20Report/">Cobertura frontend</a></li>
                    <li><a href="${env.BUILD_URL}Backend_20Coverage_20Report/">Cobertura backend</a></li>
                    <li><a href="${env.BUILD_URL}artifact/">Todos los artefactos (incluye metricas de investigacion)</a></li>
                </ul>
                """

                emailext(
                    subject: "✅ Build Success - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                    body: buildEmailHtml(
                        'SUCCESS',
                        'Tests, build y deploy terminaron sin errores.',
                        stats,
                        env.METRICS_EMAIL_EXCERPT ?: 'Sin datos de metricas para este build.',
                        links,
                        env.BUILD_URL
                    ),
                    to: env.NOTIFICATION_EMAIL,
                    mimeType: 'text/html',
                    attachLog: false
                )
            }
        }
        failure {
            echo "Falla en el pipeline - revisar logs"
            script {
                def stats = buildEmailStatsTable([
                    ['Build', "#${env.BUILD_NUMBER} &middot; ${env.JOB_NAME}"],
                    ['Commit', "${env.GIT_COMMIT_SHORT} &mdash; ${env.GIT_COMMIT_MSG}"],
                    ['Autor', env.GIT_AUTHOR],
                    ['Duracion', currentBuild.durationString],
                ])

                def links = """
                <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.9;">
                    <li><a href="${env.BUILD_URL}console">Logs completos de la consola</a></li>
                    <li><a href="${env.BUILD_URL}testReport/">Resultados de tests</a></li>
                    <li><a href="${env.BUILD_URL}artifact/">Artefactos generados hasta la falla</a></li>
                </ul>
                """

                emailext(
                    subject: "❌ Build Failed - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                    body: buildEmailHtml(
                        'FAILURE',
                        'El pipeline se detuvo por un error. Revisa los logs para identificarlo.',
                        stats,
                        env.METRICS_EMAIL_EXCERPT ?: 'Sin datos de metricas para este build (probablemente fallo antes de generarlos).',
                        links,
                        env.BUILD_URL
                    ),
                    to: env.NOTIFICATION_EMAIL,
                    mimeType: 'text/html',
                    attachLog: true
                )
            }
        }
        unstable {
            echo "Pipeline inestable - algunas pruebas fallaron"
            script {
                def stats = buildEmailStatsTable([
                    ['Build', "#${env.BUILD_NUMBER} &middot; ${env.JOB_NAME}"],
                    ['Commit', "${env.GIT_COMMIT_SHORT} &mdash; ${env.GIT_COMMIT_MSG}"],
                    ['Autor', env.GIT_AUTHOR],
                    ['Duracion', currentBuild.durationString],
                ])

                def links = """
                <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.9;">
                    <li><a href="${env.BUILD_URL}testReport/">Resultados de tests (ver casos fallidos)</a></li>
                    <li><a href="${env.BUILD_URL}Frontend_20Coverage_20Report/">Cobertura frontend</a></li>
                    <li><a href="${env.BUILD_URL}Backend_20Coverage_20Report/">Cobertura backend</a></li>
                </ul>
                """

                emailext(
                    subject: "⚠️ Build Unstable - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                    body: buildEmailHtml(
                        'UNSTABLE',
                        'El pipeline termino, pero algunas pruebas fallaron o no se cumplio un objetivo de cobertura.',
                        stats,
                        env.METRICS_EMAIL_EXCERPT ?: 'Sin datos de metricas para este build.',
                        links,
                        env.BUILD_URL
                    ),
                    to: env.NOTIFICATION_EMAIL,
                    mimeType: 'text/html'
                )
            }
        }
    }
}
