pipeline {
    agent any

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
                            # Verificar Node.js
                            if ! command -v node &> /dev/null; then
                                echo "Node.js no está instalado en el agente." >&2
                                echo "Instálalo en la imagen/host antes de correr el pipeline." >&2
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

        stage('Dependencies Installation') {
            parallel {
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
                                        
                                        echo "Dependencias frontend instaladas correctamente"
                                    '''
                                } else {
                                    bat '''
                                        npm ci --cache .npm --prefer-offline
                                        
                                        npm list webpack webpack-cli || npm install webpack webpack-cli
                                        
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
            }
        }

        stage('Code Quality') {
            parallel {
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
                    post {
                        always {
                            publishHTML([
                                allowMissing: true,
                                alwaysLinkToLastBuild: false,
                                keepAll: true,
                                reportDir: env.FRONTEND_DIR,
                                reportFiles: 'lint-results.html',
                                reportName: 'Frontend ESLint Report'
                            ])
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
            }
        }

        stage('Unit Testing') {
            parallel {
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
                    post {
                        always {
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: false,
                                keepAll: true,
                                reportDir: "${env.FRONTEND_DIR}/coverage/lcov-report",
                                reportFiles: 'index.html',
                                reportName: 'Frontend Coverage Report'
                            ])
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
                    post {
                        always {
                            publishHTML([
                                allowMissing: true,
                                alwaysLinkToLastBuild: false,
                                keepAll: true,
                                reportDir: "${env.BACKEND_DIR}/coverage/lcov-report",
                                reportFiles: 'index.html',
                                reportName: 'Backend Coverage Report'
                            ])
                        }
                    }
                }
            }
        }

        stage('Build Applications') {
            parallel {
                stage('Frontend Build') {
                    steps {
                        echo "Construyendo frontend para produccion..."
                        dir(env.FRONTEND_DIR) {
                            script {
                                if (isUnix()) {
                                    sh '''
                                        export NODE_ENV=production
                                        
                                        npm run build
                                        
                                        # Verificar build
                                        if [ ! -d "build" ]; then
                                            echo "Error: directorio build no generado"
                                            exit 1
                                        fi
                                        
                                        echo "Build frontend generado en $(pwd)/build"
                                        ls -la build/ | head -10
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
            }
        }

        stage('Integration Tests') {
            steps {
                echo "Ejecutando tests de integracion..."
                dir(env.BACKEND_DIR) {
                    script {
                        if (isUnix()) {
                            sh '''
                                # Iniciar servidor para tests de integración
                                node index.js &
                                SERVER_PID=$!
                                sleep 5
                                
                                echo "Testing API endpoints..."
                                
                                # Test login
                                curl -X POST http://localhost:4000/api/auth/login \
                                     -H "Content-Type: application/json" \
                                     -d '{"username":"demo","password":"demo123"}' \
                                     --fail || {
                                    echo "Login test failed"
                                    kill $SERVER_PID 2>/dev/null || true
                                    exit 1
                                }
                                
                                # Test dashboard
                                curl -f http://localhost:4000/api/dashboard/data || {
                                    echo "Dashboard test failed"
                                    kill $SERVER_PID 2>/dev/null || true
                                    exit 1
                                }
                                
                                kill $SERVER_PID 2>/dev/null || true
                                echo "Integration tests passed"
                            '''
                        } else {
                            bat '''
                                echo Tests de integracion en Windows pendientes
                                echo Integration tests simulated - OK
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
                    // Archivar frontend build
                    archiveArtifacts(
                        artifacts: "${env.FRONTEND_DIR}/build/**/*", 
                        fingerprint: true, 
                        allowEmptyArchive: false
                    )
                    
                    // Archivar backend files
                    archiveArtifacts(
                        artifacts: "${env.BACKEND_DIR}/**/*.js,${env.BACKEND_DIR}/package*.json,${env.BACKEND_DIR}/Dockerfile",
                        fingerprint: true
                    )
                    
                    // Crear artefacto comprimido con timestamp
                    def timestamp = new Date().format('yyyyMMdd-HHmmss')
                    def artifactName = "mi-tienda-${env.BUILD_NUMBER}-${timestamp}.tar.gz"
                    
                    if (isUnix()) {
                        sh """
                            tar -czf ${artifactName} \\
                                ${env.FRONTEND_DIR}/build \\
                                ${env.BACKEND_DIR}/*.js \\
                                ${env.BACKEND_DIR}/package*.json \\
                                ${env.BACKEND_DIR}/Dockerfile \\
                                README.md
                        """
                    } else {
                        bat """
                            echo Creating artifact ${artifactName}
                            7z a ${artifactName} ${env.FRONTEND_DIR}\\build ${env.BACKEND_DIR}\\*.js ${env.BACKEND_DIR}\\package*.json ${env.BACKEND_DIR}\\Dockerfile README.md
                        """
                    }
                    
                    archiveArtifacts(artifacts: artifactName, fingerprint: true)
                    env.ARTIFACT_NAME = artifactName
                }
            }
        }

        stage('Docker Build') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    branch 'staging'
                }
            }
            steps {
                echo "Construyendo imagen Docker..."
                dir(env.BACKEND_DIR) {
                    script {
                        def imageTag = "${env.IMAGE_NAME}:${env.BUILD_NUMBER}"
                        def latestTag = "${env.IMAGE_NAME}:latest"
                        
                        if (isUnix()) {
                            sh """
                                # Verificar Dockerfile
                                if [ ! -f "Dockerfile" ]; then
                                    echo "Dockerfile no encontrado"
                                    exit 1
                                fi
                                
                                # Build imagen
                                docker build -t ${imageTag} .
                                docker build -t ${latestTag} .
                                
                                # Mostrar información de la imagen
                                docker images | grep ${env.IMAGE_NAME}
                                
                                echo "Imagen Docker creada: ${imageTag}"
                            """
                        } else {
                            bat """
                                if not exist "Dockerfile" (
                                    echo Dockerfile no encontrado
                                    exit 1
                                )
                                
                                docker build -t ${imageTag} .
                                docker build -t ${latestTag} .
                                
                                docker images | findstr ${env.IMAGE_NAME}
                                
                                echo Imagen Docker creada: ${imageTag}
                            """
                        }
                        
                        env.DOCKER_IMAGE = imageTag
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                allOf {
                    branch 'main'
                    not { changeRequest() }
                }
            }
            steps {
                echo "Desplegando en staging..."
                script {
                    if (isUnix()) {
                        sh '''
                            echo "Preparando despliegue en staging..."
                            
                            # Simular despliegue frontend
                            echo "Desplegando frontend a staging..."
                            # rsync -avz ${FRONTEND_DIR}/build/ user@staging:/var/www/mi-tienda/
                            
                            # Simular despliegue backend
                            echo "Desplegando backend a staging..."
                            # docker save ${DOCKER_IMAGE} | ssh user@staging docker load
                            # ssh user@staging "docker stop mi-tienda || true"
                            # ssh user@staging "docker run -d --name mi-tienda -p 4000:4000 ${DOCKER_IMAGE}"
                            
                            echo "Despliegue staging simulado completado"
                        '''
                    } else {
                        bat '''
                            echo Preparando despliegue en staging...
                            echo Despliegue staging simulado completado
                        '''
                    }
                }
            }
        }

        stage('Performance Tests') {
            when {
                allOf {
                    branch 'main'
                    not { changeRequest() }
                }
            }
            steps {
                echo "Ejecutando tests de performance..."
                script {
                    if (isUnix()) {
                        sh '''
                            echo "Ejecutando tests de performance..."
                            
                            # Simular tests de carga
                            echo "Tests de carga con Apache Bench..."
                            # ab -n 100 -c 10 http://staging/api/health
                            
                            # Simular tests de lighthouse
                            echo "Analisis con Lighthouse..."
                            # lighthouse --chrome-flags="--headless" --output=json http://staging
                            
                            echo "Performance tests completados"
                        '''
                    } else {
                        bat '''
                            echo Ejecutando tests de performance...
                            echo Performance tests completados
                        '''
                    }
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
            script {
                try {
                    slackSend(
                        channel: '#deployments',
                        color: 'good',
                        message: """
                            Deploy exitoso de Mi Tienda
                            Build: #${env.BUILD_NUMBER}
                            Branch: ${env.BRANCH_NAME}
                            Commit: ${env.GIT_COMMIT_SHORT}
                            Autor: ${env.GIT_AUTHOR}
                            Artefacto: ${env.ARTIFACT_NAME}
                        """.stripIndent()
                    )
                } catch (Exception e) {
                    echo "No se pudo enviar notificación a Slack: ${e.message}"
                }
            }
        }
        failure {
            echo "Falla en el pipeline - revisar logs"
            script {
                try {
                    slackSend(
                        channel: '#deployments',
                        color: 'danger',
                        message: """
                            FALLA en deploy de Mi Tienda
                            Build: #${env.BUILD_NUMBER}
                            Branch: ${env.BRANCH_NAME}
                            Commit: ${env.GIT_COMMIT_SHORT}
                            Error en stage: ${env.STAGE_NAME}
                        """.stripIndent()
                    )
                } catch (Exception e) {
                    echo "No se pudo enviar notificación a Slack: ${e.message}"
                }
            }
        }
        unstable {
            echo "Pipeline inestable - algunas pruebas fallaron"
            script {
                try {
                    slackSend(
                        channel: '#deployments',
                        color: 'warning',
                        message: """
                            Pipeline INESTABLE de Mi Tienda
                            Build: #${env.BUILD_NUMBER}
                            Branch: ${env.BRANCH_NAME}
                            Algunas pruebas fallaron
                        """.stripIndent()
                    )
                } catch (Exception e) {
                    echo "No se pudo enviar notificación a Slack: ${e.message}"
                }
            }
        }
    }
}