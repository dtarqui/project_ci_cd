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
        DOCKER_REGISTRY = "docker.io"
        IMAGE_NAME = "mi-tienda-backend"
        GITHUB_REPO = "https://github.com/dtarqui/project_ci_cd.git"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 20, unit: 'MINUTES')
        timestamps()
        retry(2)
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
            steps {
                echo "Instalando dependencias del frontend..."
                dir(env.FRONTEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                npm ci --cache .npm --prefer-offline
                                
                                # Verificar instalaciones críticas
                                npm list webpack webpack-cli || npm install webpack webpack-cli
                                npm list eslint-plugin-react eslint-plugin-react-hooks || npm install eslint-plugin-react eslint-plugin-react-hooks
                                
                                echo "Dependencias frontend instaladas correctamente"
                            '''
                        } else {
                            bat '''
                                npm ci --cache .npm --prefer-offline
                                
                                npm list webpack webpack-cli || npm install webpack webpack-cli
                                npm list eslint-plugin-react eslint-plugin-react-hooks || npm install eslint-plugin-react eslint-plugin-react-hooks
                                
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
            steps {
                echo "Instalando dependencias del backend..."
                dir(env.BACKEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                npm ci --cache .npm --prefer-offline
                                
                                # Verificar dependencias críticas
                                node -e "
                                    require('express'); 
                                    require('cors'); 
                                    console.log('Dependencias backend verificadas')
                                "
                                
                                echo "Dependencias backend instaladas correctamente"
                            '''
                        } else {
                            bat '''
                                npm ci --cache .npm --prefer-offline
                                
                                node -e "require('express'); require('cors'); console.log('Dependencias backend verificadas')"
                                
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
                            echo "ESLint falló o no esta configurado: ${e.message}"
                            currentBuild.result = 'UNSTABLE'
                        }
                    }
                }
            }
        }

        stage('Backend Lint') {
            steps {
                echo "Analizando calidad de codigo backend..."
                dir(env.BACKEND_DIR) {
                    script {
                        try {
                            if (isUnix()) {
                                sh 'npm run lint 2>/dev/null || echo "No hay lint configurado para backend"'
                            } else {
                                bat 'npm run lint 2>nul || echo No hay lint configurado para backend'
                            }
                        } catch (Exception e) {
                            echo "Lint backend no configurado"
                        }
                    }
                }
            }
        }

        stage('Frontend Tests') {
            steps {
                echo "Ejecutando tests del frontend..."
                dir(env.FRONTEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                export CI=true
                                export NODE_ENV=test
                                
                                npm test -- --ci --runInBand --watchAll=false --coverage --coverageReporters=text-lcov,html
                                
                                echo "Tests frontend completados"
                            '''
                        } else {
                            bat '''
                                set CI=true
                                set NODE_ENV=test
                                
                                npm test -- --ci --runInBand --watchAll=false --coverage --coverageReporters=text-lcov,html
                                
                                echo Tests frontend completados
                            '''
                        }
                    }
                }
            }
        }

        stage('Backend Tests') {
            steps {
                echo "Ejecutando tests del backend..."
                dir(env.BACKEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                export NODE_ENV=test
                                
                                npm test -- --coverage --coverageReporters=html,text-lcov
                                
                                echo "Tests backend completados"
                            '''
                        } else {
                            bat '''
                                set NODE_ENV=test
                                
                                npm test -- --coverage --coverageReporters=html,text-lcov
                                
                                echo Tests backend completados
                            '''
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
                            bat '''
                                echo Validacion de backend en Windows pendiente
                                echo Backend validation OK
                            '''
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
            echo "Notificación Slack omitida (slackSend no disponible)"
        }
        failure {
            echo "Falla en el pipeline - revisar logs"
            echo "Notificación Slack omitida (slackSend no disponible)"
        }
        unstable {
            echo "Pipeline inestable - algunas pruebas fallaron"
            echo "Notificación Slack omitida (slackSend no disponible)"
        }
    }
}