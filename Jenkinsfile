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

def trimMetricsForEmail(mdText) {
    if (!mdText?.trim()) {
        return 'No se encontro docs/metrics/latest-build.md para este build.'
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

def buildEmailHtml(status, headline, statsHtml, metricsExcerpt, linksHtml, buildUrl, projectName) {
    def color = emailStatusColor(status)
    def bg = emailStatusBg(status)
    return """
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f2937;">
      <div style="background:${color};color:#ffffff;padding:20px 24px;border-radius:8px 8px 0 0;">
        <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.85;">${projectName} &middot; CI/CD</div>
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

def buildEmailStatsTable(rows) {
    def cells = rows.collect { row ->
        def label = row[0]
        def value = row[1]
        """<tr>
             <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;">${label}</td>
             <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${value}</td>
           </tr>"""
    }.join("\n")
    return "<table style=\"border-collapse:collapse;width:100%;\">${cells}</table>"
}

def migrationStatusText(status) {
    if (status == 'OK') { return 'aplicadas' }
    if (status == 'FAILED') { return 'fallidas' }
    return 'no ejecutadas'
}

def postDeployCheckText(status) {
    if (status == 'PASSED') { return 'superada' }
    if (status == 'FAILED') { return 'fallida' }
    return 'no ejecutada'
}

pipeline {
    agent any

    // Usa la instalación NodeJS definida en Jenkins (Manage Jenkins > Tools > NodeJS installations)
    // Asegúrate que el nombre aquí coincida con el configurado en la UI (ej: Node18)
    tools {
        nodejs 'Node18'
    }

    environment {
        // ====================================================================
        // PARAMETROS DEL PROYECTO
        // Todo lo que depende de la aplicacion integrada vive en este bloque.
        // Para adoptar la plantilla en otro proyecto Node.js + React se ajustan
        // estos valores; las etapas de mas abajo no se modifican. Un valor vacio
        // desactiva el paso correspondiente. Fuera de este bloque solo quedan
        // dos literales que Jenkins exige fijos: el tool `nodejs` (bloque tools)
        // y la frecuencia de `pollSCM` (bloque triggers).
        // ====================================================================

        // Identificacion del proyecto en correos y artefactos
        PROJECT_DISPLAY_NAME = "Mi Tienda Online"
        ARTIFACT_PREFIX = "mi-tienda"
        NOTIFICATION_EMAIL = "dmtarqui@gmail.com"

        // Repositorio y estructura del monorepo
        GITHUB_REPO = "https://github.com/dtarqui/project_ci_cd.git"
        GIT_BRANCH_SPEC = "*/main"
        FRONTEND_DIR = "frontend"
        BACKEND_DIR = "backend"

        // Validacion local del backend antes de desplegar (etapa Backend Validation).
        // El servidor se arranca con PORT=BACKEND_PORT y se consulta BACKEND_HEALTH_PATH.
        BACKEND_START_CMD = "node index.js"
        BACKEND_PORT = "4000"
        BACKEND_HEALTH_PATH = "/health"

        // Base de datos (etapa Database Migrations). La cadena de conexion de staging
        // es la credencial Secret text DB_URL_CREDENTIAL_ID y llega como DATABASE_URL.
        // DB_MIGRATE_CMD aplica las migraciones pendientes; DB_SCHEMA_CHECK_CMD compara
        // despues el esquema de la base con el que espera el codigo y falla si difieren.
        // Vaciar DB_MIGRATE_CMD desactiva la etapa (proyectos sin base de datos).
        DB_URL_CREDENTIAL_ID = "database-url"
        DB_MIGRATE_CMD = "npx prisma migrate deploy"
        DB_SCHEMA_CHECK_CMD = "npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code"

        // Despliegue en Vercel
        VERCEL_TOKEN_CREDENTIAL_ID = "vercel-token"
        // Identificadores de proyecto/org (opcionales si cada componente tiene .vercel/project.json)
        VERCEL_BACKEND_PROJECT = ""
        VERCEL_BACKEND_ORG = ""
        VERCEL_FRONTEND_PROJECT = ""
        VERCEL_FRONTEND_ORG = ""
        // Entorno de Vercel donde se publica. Con "production" se despliega con --prod.
        BACKEND_VERCEL_ENV = "production"
        FRONTEND_VERCEL_ENV = "production"
        // Variables del backend que se agregan en Vercel si faltan (formato: KEY=VALUE por linea).
        // Nunca secretos reales aqui: el repositorio es publico.
        BACKEND_ENV_VARS = ""
        // Variables que deben existir en Vercel antes de desplegar el backend (separadas por coma).
        BACKEND_REQUIRED_ENV = "JWT_SECRET"
        // Variables que el pipeline reemplaza en cada despliegue del backend (KEY=VALUE por linea).
        // En este caso de estudio abren CORS a cualquier origen, porque el frontend llama al
        // backend en otro dominio. Es una decision del caso, no de la plantilla.
        BACKEND_FORCED_ENV = "CORS_ALLOW_ORIGIN=*\nCORS_ALLOW_METHODS=GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD\nCORS_ALLOW_HEADERS=Origin, X-Requested-With, Content-Type, Accept, Authorization"

        // Conexion del frontend con el backend desplegado (etapas Frontend Build y Deploy Vercel)
        // FRONTEND_API_URL_VAR: variable de build del frontend que recibe la URL del backend.
        // FRONTEND_BACKEND_URL_FILE / _TOKEN: archivo del frontend donde se reemplaza el marcador
        // por el dominio del backend (rewrites de Vercel).
        FRONTEND_API_URL_VAR = "API_BASE_URL"
        FRONTEND_BACKEND_URL_FILE = "vercel.json"
        FRONTEND_BACKEND_URL_TOKEN = "__BACKEND_URL__"

        // Verificacion de la version publicada (etapa Post-Deploy Smoke Test, scripts/ci/smoke-test.js).
        // Lista separada por ";" de RUTA o RUTA=>TEXTO: cada ruta debe responder 2xx y, si se
        // indica, contener TEXTO. /health/ready consulta cada tabla de la base: falla si el
        // esquema no coincide con el codigo o si la app no esta usando la base de datos.
        SMOKE_BACKEND_CHECKS = '/health=>"status":"ok";/health/ready=>"repositoryMode":"database"'
        SMOKE_FRONTEND_CHECKS = '/=><div id="root">'

        // ====================================================================
        // CONFIGURACION DEL PIPELINE (no depende del proyecto)
        // ====================================================================
        NODE_VERSION = "18"
        CI = "true"

        // Métricas y monitoreo
        //
        // STAGE_START_TIME NO se declara aqui a proposito: una variable definida
        // en este bloque environment{} tiene precedencia sobre cualquier
        // asignacion posterior a env.STAGE_START_TIME, de modo que los stages
        // leian siempre la cadena vacia y las duraciones de tests salian en 0.
        // Se asigna dinamicamente al inicio de cada stage medido.
        //
        // METRICS_PROFILE identifica el proceso que se esta midiendo:
        //   post-cicd = este pipeline (proceso automatizado, TO-BE)
        //   pre-cicd  = linea base manual, que se genera aparte ejecutando el
        //               script con METRICS_PROFILE=pre-cicd y los tiempos
        //               cronometrados del proceso manual (ver Notas/ESPECIFICACION_METRICAS.md).
        METRICS_PROFILE = "post-cicd"
        // No cambiar: .gitignore solo ignora docs/metrics/. En otra ruta, los reportes
        // dejarian de estar ignorados y acabarian subidos al repositorio.
        METRICS_DIR = "docs/metrics"
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
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
                script {
                    echo "Obteniendo codigo del repositorio GitHub..."
                    
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: env.GIT_BRANCH_SPEC]],
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
                    
                    env.GIT_COMMIT_TIMESTAMP = sh(
                        script: 'git log -1 --pretty=%ct',
                        returnStdout: true
                    ).trim()

                    echo "Commit: ${env.GIT_COMMIT_SHORT}"
                    echo "Mensaje: ${env.GIT_COMMIT_MSG}"
                    echo "Autor: ${env.GIT_AUTHOR}"
                    echo "Timestamp: ${env.GIT_COMMIT_TIMESTAMP}"

                    if (isUnix()) {
                        sh "rm -rf ${env.FRONTEND_DIR}/junit.xml ${env.FRONTEND_DIR}/coverage ${env.BACKEND_DIR}/junit.xml ${env.BACKEND_DIR}/coverage"
                    } else {
                        bat """
                            if exist "${env.FRONTEND_DIR}\\junit.xml" del /q "${env.FRONTEND_DIR}\\junit.xml"
                            if exist "${env.FRONTEND_DIR}\\coverage" rmdir /s /q "${env.FRONTEND_DIR}\\coverage"
                            if exist "${env.BACKEND_DIR}\\junit.xml" del /q "${env.BACKEND_DIR}\\junit.xml"
                            if exist "${env.BACKEND_DIR}\\coverage" rmdir /s /q "${env.BACKEND_DIR}\\coverage"
                            exit /b 0
                        """
                    }
                }
            }
        }

        stage('Environment Setup') {
            steps {
                script {
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
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
                script {
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
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
                script {
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
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
                script {
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
                echo "Analizando calidad de codigo frontend..."
                dir(env.FRONTEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh 'npm run lint'
                        } else {
                            bat 'npm run lint'
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
                script {
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
                echo "Analizando calidad de codigo backend..."
                dir(env.BACKEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh 'npm run lint'
                        } else {
                            bat 'npm run lint'
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
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
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
                script {
                    if (isUnix()) {
                        sh 'node scripts/ci/check-coverage.js frontend'
                    } else {
                        bat 'node scripts\\ci\\check-coverage.js frontend'
                    }
                }
            }
            post {
                always {
                    script {
                        def duration = env.STAGE_START_TIME ? (System.currentTimeMillis() - env.STAGE_START_TIME.toLong()) / 1000 : 0
                        env.FRONTEND_TEST_DURATION_SECONDS = duration.toString()
                        echo "Frontend Tests duration: ${duration}s"
                        
                        junit(testResults: "${env.FRONTEND_DIR}/junit.xml", allowEmptyResults: true)
                        
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
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
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
                script {
                    // La cobertura minima vive en jest.config.js. El pipeline corre Jest con
                    // --coverageThreshold='{}' para que los reportes se generen siempre, asi
                    // que el umbral se verifica aqui; si no se alcanza, la etapa falla.
                    if (isUnix()) {
                        sh 'node scripts/ci/check-coverage.js backend'
                    } else {
                        bat 'node scripts\\ci\\check-coverage.js backend'
                    }
                }
            }
            post {
                always {
                    script {
                        def duration = env.STAGE_START_TIME ? (System.currentTimeMillis() - env.STAGE_START_TIME.toLong()) / 1000 : 0
                        env.BACKEND_TEST_DURATION_SECONDS = duration.toString()
                        echo "Backend Tests duration: ${duration}s"
                        
                        junit(testResults: "${env.BACKEND_DIR}/junit.xml", allowEmptyResults: true)
                        
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
                script {
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
                echo "Validando backend para produccion..."
                dir(env.BACKEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                # Verificar que el servidor puede iniciarse (BACKEND_START_CMD en BACKEND_PORT)
                                PORT="$BACKEND_PORT" timeout 10s $BACKEND_START_CMD &
                                SERVER_PID=$!

                                sleep 3

                                # Health check (BACKEND_HEALTH_PATH)
                                curl -f "http://localhost:${BACKEND_PORT}${BACKEND_HEALTH_PATH}" || {
                                    echo "Health check fallido"
                                    kill $SERVER_PID 2>/dev/null || true
                                    exit 1
                                }

                                kill $SERVER_PID 2>/dev/null || true
                                echo "Backend validado correctamente"
                            '''
                        } else {
                            bat '''
                                set PORT=%BACKEND_PORT%
                                start /B %BACKEND_START_CMD% > server.log 2>&1
                                ping -n 4 127.0.0.1 >nul

                                powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri ('http://localhost:' + $env:BACKEND_PORT + $env:BACKEND_HEALTH_PATH) -TimeoutSec 5 | Out-Null; exit 0 } catch { Write-Host 'Health check fallido'; exit 1 }"
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

        stage('Database Migrations') {
            when {
                expression { return env.DB_MIGRATE_CMD?.trim() ? true : false }
            }
            steps {
                script {
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
                echo "Aplicando migraciones de base de datos..."
                dir(env.BACKEND_DIR) {
                    withCredentials([string(credentialsId: env.DB_URL_CREDENTIAL_ID, variable: 'DATABASE_URL')]) {
                        script {
                            if (isUnix()) {
                                sh 'set -e; $DB_MIGRATE_CMD'
                                if (env.DB_SCHEMA_CHECK_CMD?.trim()) {
                                    echo "Comparando el esquema de la base con el del codigo..."
                                    sh 'set -e; $DB_SCHEMA_CHECK_CMD'
                                }
                            } else {
                                bat '%DB_MIGRATE_CMD%'
                                if (env.DB_SCHEMA_CHECK_CMD?.trim()) {
                                    echo "Comparando el esquema de la base con el del codigo..."
                                    bat '%DB_SCHEMA_CHECK_CMD%'
                                }
                            }
                        }
                    }
                }
            }
            post {
                success {
                    script {
                        env.DB_MIGRATION_STATUS = 'OK'
                    }
                }
                failure {
                    script {
                        env.DB_MIGRATION_STATUS = 'FAILED'
                    }
                    echo "Migraciones o comparacion de esquema fallidas: no se despliega. Revisa que exista la credencial '${env.DB_URL_CREDENTIAL_ID}' (Secret text) con la cadena de conexion de staging. Si el error es P3005, la base ya tiene el esquema pero no su historial: ver jenkins/GUIA_PIPELINE.md."
                }
            }
        }

        stage('Deploy Backend Vercel') {
            steps {
                script {
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
                script {
                    env.STAGE_START_TIME = System.currentTimeMillis().toString()
                }
                echo "Desplegando backend a Vercel..."
                dir(env.BACKEND_DIR) {
                    withCredentials([string(credentialsId: env.VERCEL_TOKEN_CREDENTIAL_ID, variable: 'VERCEL_TOKEN')]) {
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

                                        # Solo el entorno production de Vercel se despliega con --prod.
                                        PROD_FLAG=""
                                        if [ "$BACKEND_VERCEL_ENV" = "production" ]; then
                                            PROD_FLAG="--prod"
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

                                        # Variables que deben existir en Vercel antes de construir y desplegar
                                        # (BACKEND_REQUIRED_ENV, separadas por coma).
                                        if [ -n "$BACKEND_REQUIRED_ENV" ]; then
                                            EXISTING_ENV=$(vercel env ls "$BACKEND_VERCEL_ENV" --token $VERCEL_TOKEN $PROJECT_ARGS 2>/dev/null || true)
                                            for NAME in $(echo "$BACKEND_REQUIRED_ENV" | tr ',' ' '); do
                                                if ! echo "$EXISTING_ENV" | grep -Eq "(^|[[:space:]])${NAME}([[:space:]]|$)"; then
                                                    echo "ERROR: $NAME no configurado en Vercel para entorno $BACKEND_VERCEL_ENV" 1>&2
                                                    exit 1
                                                fi
                                            done
                                        fi

                                        # Variables que el pipeline reemplaza en cada despliegue (BACKEND_FORCED_ENV,
                                        # formato KEY=VALUE por linea).
                                        if [ -n "$BACKEND_FORCED_ENV" ]; then
                                            echo "$BACKEND_FORCED_ENV" | while IFS= read -r line; do
                                                [ -z "$line" ] && continue
                                                NAME="${line%%=*}"
                                                VALUE="${line#*=}"
                                                vercel env rm "$NAME" "$BACKEND_VERCEL_ENV" --yes --token $VERCEL_TOKEN $PROJECT_ARGS 2>/dev/null || true
                                                printf "%s" "$VALUE" | vercel env add "$NAME" "$BACKEND_VERCEL_ENV" --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2
                                            done
                                        fi

                                        vercel pull --yes --environment="$BACKEND_VERCEL_ENV" --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2
                                        vercel build $PROD_FLAG --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2
                                        BACKEND_URL=$(vercel deploy --prebuilt $PROD_FLAG --token $VERCEL_TOKEN $PROJECT_ARGS | tail -1)
                                        printf "%s" "$BACKEND_URL"
                                    ''',
                                    returnStdout: true
                                ).trim()

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
                script {
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
                echo "Construyendo frontend para produccion..."
                dir(env.FRONTEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                export NODE_ENV=production

                                # Reemplazar el marcador FRONTEND_BACKEND_URL_TOKEN del archivo
                                # FRONTEND_BACKEND_URL_FILE (rewrites de Vercel) por el dominio del backend
                                if [ -n "$BACKEND_VERCEL_URL" ] && [ -n "$FRONTEND_BACKEND_URL_FILE" ] && [ -f "$FRONTEND_BACKEND_URL_FILE" ]; then
                                    echo "Reemplazando $FRONTEND_BACKEND_URL_TOKEN con $BACKEND_VERCEL_URL en $FRONTEND_BACKEND_URL_FILE..."
                                    # Extraer solo el dominio (sin https://)
                                    BACKEND_HOST="${BACKEND_VERCEL_URL#https://}"
                                    BACKEND_HOST="${BACKEND_HOST#http://}"
                                    sed -i.bak "s|${FRONTEND_BACKEND_URL_TOKEN}|$BACKEND_HOST|g" "$FRONTEND_BACKEND_URL_FILE"
                                    cat "$FRONTEND_BACKEND_URL_FILE"
                                    rm -f "$FRONTEND_BACKEND_URL_FILE.bak"
                                fi

                                # Inyectar la URL del backend desplegado como variable de build (FRONTEND_API_URL_VAR)
                                if [ -n "$BACKEND_VERCEL_URL" ] && [ -n "$FRONTEND_API_URL_VAR" ]; then
                                    echo "${FRONTEND_API_URL_VAR}=$BACKEND_VERCEL_URL" > .env
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
                                    echo Reemplazando %FRONTEND_BACKEND_URL_TOKEN% con %BACKEND_VERCEL_URL% en %FRONTEND_BACKEND_URL_FILE%...
                                    powershell -NoProfile -Command "$url=$env:BACKEND_VERCEL_URL; $file=$env:FRONTEND_BACKEND_URL_FILE; if ($url -and $file -and (Test-Path $file)) { $backendHost=$url -replace '^https?://',''; (Get-Content $file) -replace [regex]::Escape($env:FRONTEND_BACKEND_URL_TOKEN),$backendHost | Set-Content $file; Get-Content $file }"
                                )

                                if not "%BACKEND_VERCEL_URL%"=="" (
                                    echo %FRONTEND_API_URL_VAR%=%BACKEND_VERCEL_URL%> .env
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
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
                script {
                    env.STAGE_START_TIME = System.currentTimeMillis().toString()
                }
                echo "Desplegando frontend a Vercel..."
                dir(env.FRONTEND_DIR) {
                    withCredentials([string(credentialsId: env.VERCEL_TOKEN_CREDENTIAL_ID, variable: 'VERCEL_TOKEN')]) {
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

                                        # Solo el entorno production de Vercel se despliega con --prod.
                                        PROD_FLAG=""
                                        if [ "$FRONTEND_VERCEL_ENV" = "production" ]; then
                                            PROD_FLAG="--prod"
                                        fi

                                        # Inyectar la URL del backend (FRONTEND_API_URL_VAR) en las variables de
                                        # Vercel ANTES de hacer pull, para que el build del frontend apunte al
                                        # backend recien desplegado
                                        if [ -n "$BACKEND_VERCEL_URL" ] && [ -n "$FRONTEND_API_URL_VAR" ]; then
                                            echo "Inyectando $FRONTEND_API_URL_VAR=$BACKEND_VERCEL_URL en Vercel..." 1>&2
                                            # Remover si existe
                                            vercel env rm "$FRONTEND_API_URL_VAR" "$FRONTEND_VERCEL_ENV" --yes --token $VERCEL_TOKEN $PROJECT_ARGS 2>/dev/null || true
                                            # Agregar nueva variable
                                            printf "%s" "$BACKEND_VERCEL_URL" | vercel env add "$FRONTEND_API_URL_VAR" "$FRONTEND_VERCEL_ENV" --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2
                                            echo "Variable $FRONTEND_API_URL_VAR inyectada correctamente" 1>&2
                                        fi

                                        vercel pull --yes --environment="$FRONTEND_VERCEL_ENV" --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2
                                        vercel build $PROD_FLAG --token $VERCEL_TOKEN $PROJECT_ARGS 1>&2
                                        FRONTEND_URL=$(vercel deploy --prebuilt $PROD_FLAG --token $VERCEL_TOKEN $PROJECT_ARGS | tail -1)
                                        printf "%s" "$FRONTEND_URL"
                                    ''',
                                    returnStdout: true
                                ).trim()

                                env.VERCEL_URL = frontendDeployOutput.readLines().last().trim()
                            } else {
                                bat '''
                                    npm install -g vercel
                                    set PROJECT_ARGS=
                                    if not "%VERCEL_FRONTEND_PROJECT%"=="" if not "%VERCEL_FRONTEND_ORG%"=="" (
                                        set PROJECT_ARGS=--project %VERCEL_FRONTEND_PROJECT% --org %VERCEL_FRONTEND_ORG%
                                    )

                                    if not "%BACKEND_VERCEL_URL%"=="" (
                                        echo Inyectando %FRONTEND_API_URL_VAR%=%BACKEND_VERCEL_URL% en Vercel...
                                        vercel env rm %FRONTEND_API_URL_VAR% %FRONTEND_VERCEL_ENV% --yes --token %VERCEL_TOKEN% %PROJECT_ARGS% 2>nul
                                        echo %BACKEND_VERCEL_URL%| vercel env add %FRONTEND_API_URL_VAR% %FRONTEND_VERCEL_ENV% --token %VERCEL_TOKEN% %PROJECT_ARGS%
                                        echo Variable %FRONTEND_API_URL_VAR% inyectada correctamente
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

        stage('Post-Deploy Smoke Test') {
            when {
                expression { return (env.SMOKE_BACKEND_CHECKS?.trim() || env.SMOKE_FRONTEND_CHECKS?.trim()) ? true : false }
            }
            steps {
                script {
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
                echo "Verificando la version publicada..."
                script {
                    if (isUnix()) {
                        sh 'node scripts/ci/smoke-test.js'
                    } else {
                        bat 'node scripts\\ci\\smoke-test.js'
                    }
                }
            }
            post {
                success {
                    script {
                        env.POST_DEPLOY_CHECK = 'PASSED'
                    }
                }
                failure {
                    script {
                        env.POST_DEPLOY_CHECK = 'FAILED'
                    }
                }
            }
        }

        stage('Package Artifacts') {
            steps {
                script {
                    env.CURRENT_STAGE = env.STAGE_NAME
                }
                echo "Empaquetando artefactos..."
                script {
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

                    archiveArtifacts(
                        artifacts: "${env.BACKEND_DIR}/**/*.js,${env.BACKEND_DIR}/package*.json,${env.BACKEND_DIR}/Dockerfile",
                        fingerprint: true
                    )

                    def timestamp = new Date().format('yyyyMMdd-HHmmss')
                    def artifactName = "${env.ARTIFACT_PREFIX}-${env.BUILD_NUMBER}-${timestamp}.tar.gz"

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
                    artifacts: "${env.METRICS_DIR}/metrics-history.csv,${env.METRICS_DIR}/latest-build.md,${env.METRICS_DIR}/build-metrics-${env.BUILD_NUMBER}.json,${env.METRICS_DIR}/build-metrics-${env.BUILD_NUMBER}.txt,${env.METRICS_DIR}/comparative-before-after.md,${env.METRICS_DIR}/scrum-indicators.md,${env.METRICS_DIR}/methodology-barriers-template.md,${env.METRICS_DIR}/sprint-metrics-template.csv,${env.METRICS_DIR}/sprint-metrics.csv",
                    allowEmptyArchive: true
                )

                def metricsMdPath = "${env.METRICS_DIR}/latest-build.md"
                def metricsMdText = fileExists(metricsMdPath) ? readFile(metricsMdPath) : ''
                env.METRICS_EMAIL_EXCERPT = trimMetricsForEmail(metricsMdText)

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
                    ['Migraciones', migrationStatusText(env.DB_MIGRATION_STATUS)],
                    ['Verificacion staging', postDeployCheckText(env.POST_DEPLOY_CHECK)],
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
                    subject: "Build Success - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                    body: buildEmailHtml(
                        'SUCCESS',
                        'Tests, build y deploy terminaron sin errores.',
                        stats,
                        env.METRICS_EMAIL_EXCERPT ?: 'Sin datos de metricas para este build.',
                        links,
                        env.BUILD_URL,
                        env.PROJECT_DISPLAY_NAME
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
                    ['Etapa', env.CURRENT_STAGE ?: 'no registrada'],
                    ['Migraciones', migrationStatusText(env.DB_MIGRATION_STATUS)],
                    ['Verificacion staging', postDeployCheckText(env.POST_DEPLOY_CHECK)],
                ])

                def links = """
                <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.9;">
                    <li><a href="${env.BUILD_URL}console">Logs completos de la consola</a></li>
                    <li><a href="${env.BUILD_URL}testReport/">Resultados de tests</a></li>
                    <li><a href="${env.BUILD_URL}artifact/">Artefactos generados hasta la falla</a></li>
                </ul>
                """

                emailext(
                    subject: "Build Failed - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                    body: buildEmailHtml(
                        'FAILURE',
                        'El pipeline se detuvo por un error. Revisa los logs para identificarlo.',
                        stats,
                        env.METRICS_EMAIL_EXCERPT ?: 'Sin datos de metricas para este build (probablemente fallo antes de generarlos).',
                        links,
                        env.BUILD_URL,
                        env.PROJECT_DISPLAY_NAME
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
                    ['Etapa', env.CURRENT_STAGE ?: 'no registrada'],
                ])

                def links = """
                <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.9;">
                    <li><a href="${env.BUILD_URL}testReport/">Resultados de tests (ver casos fallidos)</a></li>
                    <li><a href="${env.BUILD_URL}Frontend_20Coverage_20Report/">Cobertura frontend</a></li>
                    <li><a href="${env.BUILD_URL}Backend_20Coverage_20Report/">Cobertura backend</a></li>
                </ul>
                """

                emailext(
                    subject: "Build Unstable - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                    body: buildEmailHtml(
                        'UNSTABLE',
                        'El pipeline termino, pero algunas pruebas fallaron o no se cumplio un objetivo de cobertura.',
                        stats,
                        env.METRICS_EMAIL_EXCERPT ?: 'Sin datos de metricas para este build.',
                        links,
                        env.BUILD_URL,
                        env.PROJECT_DISPLAY_NAME
                    ),
                    to: env.NOTIFICATION_EMAIL,
                    mimeType: 'text/html'
                )
            }
        }
    }
}
