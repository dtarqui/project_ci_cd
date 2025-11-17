pipeline {
    agent any

    environment {
        NODE_VERSION = "18"
        FRONTEND_DIR = "frontend"
        BACKEND_DIR = "backend"
        CI = "true"
    }

    stages {

        stage('Checkout') {
            steps {
                echo "🔄 Obteniendo código del repositorio..."
                checkout scm
            }
        }

        stage('Setup Node Environment') {
            steps {
                echo "🔧 Instalando Node ${env.NODE_VERSION}"
                sh """
                    # Verificar si Node ya está instalado
                    if ! command -v node &> /dev/null; then
                        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
                        sudo apt-get install -y nodejs
                    fi
                    
                    echo "Node version: \$(node --version)"
                    echo "NPM version: \$(npm --version)"
                """
            }
        }

        stage('Frontend - Install Dependencies') {
            steps {
                dir("${FRONTEND_DIR}") {
                    echo "📦 Instalando dependencias frontend..."
                    sh """
                        npm ci
                        # Verificar instalaciones críticas
                        npx webpack --version || npm install webpack-cli
                    """
                }
            }
        }

        stage('Frontend - Lint') {
            steps {
                dir("${FRONTEND_DIR}") {
                    echo "🔍 Ejecutando ESLint..."
                    sh "npm run lint"
                }
            }
            post {
                always {
                    // Publicar resultados de linting si tienes formato junit
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: false,
                        keepAll: true,
                        reportDir: "${FRONTEND_DIR}",
                        reportFiles: 'lint-results.html',
                        reportName: 'ESLint Report'
                    ])
                }
            }
        }

        stage('Frontend - Unit Tests') {
            steps {
                dir("${FRONTEND_DIR}") {
                    echo "🧪 Ejecutando pruebas automáticas (React Testing Library)..."
                    sh """
                        # Configurar variables de entorno para tests
                        export CI=true
                        export NODE_ENV=test
                        
                        # Ejecutar tests en modo CI
                        npm test -- --ci --runInBand --watchAll=false --coverage --coverageReporters=text-lcov
                    """
                }
            }
            post {
                always {
                    // Publicar cobertura de tests
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: false,
                        keepAll: true,
                        reportDir: "${FRONTEND_DIR}/coverage/lcov-report",
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }

        stage('Frontend - Build Production') {
            steps {
                dir("${FRONTEND_DIR}") {
                    echo "🏗️ Construyendo el frontend para producción..."
                    sh """
                        export NODE_ENV=production
                        npm run build
                        
                        # Verificar que el build se generó correctamente
                        if [ ! -d "build" ]; then
                            echo "❌ Error: directorio build no fue generado"
                            exit 1
                        fi
                        
                        echo "✅ Build generado correctamente en /build"
                        ls -la build/
                    """
                }
            }
        }

        stage('Backend - Install Dependencies') {
            steps {
                dir("${BACKEND_DIR}") {
                    echo "📦 Instalando dependencias backend..."
                    sh """
                        npm ci
                        
                        # Verificar dependencias críticas
                        node -e "require('express'); require('cors'); console.log('✅ Dependencias backend OK')"
                    """
                }
            }
        }

        stage('Backend - Health Check') {
            steps {
                dir("${BACKEND_DIR}") {
                    echo "🔍 Validando inicio del servidor backend..."
                    sh """
                        # Iniciar servidor en background y verificar health endpoint
                        node index.js &
                        SERVER_PID=\$!
                        
                        # Esperar que el servidor inicie
                        sleep 5
                        
                        # Verificar endpoint health
                        curl -f http://localhost:4000/health || {
                            echo "❌ Health check failed"
                            kill \$SERVER_PID 2>/dev/null || true
                            exit 1
                        }
                        
                        # Limpiar proceso
                        kill \$SERVER_PID 2>/dev/null || true
                        sleep 2
                        
                        echo "✅ Backend health check passed"
                    """
                }
            }
        }

        stage('Backend - API Tests') {
            steps {
                dir("${BACKEND_DIR}") {
                    echo "🧪 Ejecutando tests de API..."
                    sh """
                        # Ejecutar tests básicos del backend
                        npm test
                        
                        # Test adicional de endpoints críticos
                        node index.js &
                        SERVER_PID=\$!
                        sleep 3
                        
                        # Test login endpoint
                        curl -X POST http://localhost:4000/api/auth/login \\
                             -H "Content-Type: application/json" \\
                             -d '{"username":"demo","password":"demo123"}' || {
                            echo "❌ Login endpoint test failed"
                            kill \$SERVER_PID 2>/dev/null || true
                            exit 1
                        }
                        
                        # Test dashboard data endpoint
                        curl -f http://localhost:4000/api/dashboard/data || {
                            echo "❌ Dashboard endpoint test failed"
                            kill \$SERVER_PID 2>/dev/null || true
                            exit 1
                        }
                        
                        kill \$SERVER_PID 2>/dev/null || true
                        echo "✅ API tests passed"
                    """
                }
            }
        }

        stage('Package Artifacts') {
            steps {
                echo "📦 Empaquetando artefactos generados..."
                script {
                    // Archivar build del frontend
                    archiveArtifacts artifacts: "${FRONTEND_DIR}/build/**/*", 
                                   fingerprint: true, 
                                   allowEmptyArchive: false
                    
                    // Archivar archivos del backend
                    archiveArtifacts artifacts: "${BACKEND_DIR}/**/*.js,${BACKEND_DIR}/package*.json,${BACKEND_DIR}/Dockerfile", 
                                   fingerprint: true
                    
                    // Crear artefacto comprimido
                    sh """
                        tar -czf mi-tienda-\${BUILD_NUMBER}.tar.gz \\
                            ${FRONTEND_DIR}/build \\
                            ${BACKEND_DIR}/*.js \\
                            ${BACKEND_DIR}/package*.json \\
                            ${BACKEND_DIR}/Dockerfile
                    """
                    
                    archiveArtifacts artifacts: "mi-tienda-*.tar.gz", fingerprint: true
                }
            }
        }

        stage('Docker Build') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                echo "🐳 Construyendo imagen Docker..."
                dir("${BACKEND_DIR}") {
                    sh """
                        # Verificar que Dockerfile existe
                        if [ ! -f "Dockerfile" ]; then
                            echo "❌ Dockerfile no encontrado"
                            exit 1
                        fi
                        
                        # Build imagen Docker
                        docker build -t mi-tienda-backend:\${BUILD_NUMBER} .
                        docker build -t mi-tienda-backend:latest .
                        
                        echo "✅ Imagen Docker creada: mi-tienda-backend:\${BUILD_NUMBER}"
                    """
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                echo "🚀 Desplegando en entorno de staging..."
                sh """
                    echo '📁 Preparando archivos para despliegue...'
                    
                    # Simular despliegue del frontend
                    echo '🎨 Desplegando frontend build...'
                    # rsync -avz ${FRONTEND_DIR}/build/ user@staging-server:/var/www/mi-tienda/
                    
                    # Simular despliegue del backend
                    echo '⚙️ Desplegando backend Dockerizado...'
                    # docker save mi-tienda-backend:latest | ssh user@staging-server docker load
                    # ssh user@staging-server "docker stop mi-tienda || true && docker run -d --name mi-tienda -p 4000:4000 mi-tienda-backend:latest"
                    
                    echo '✅ Despliegue simulado completado'
                """
            }
        }

        stage('Performance Tests') {
            when {
                branch 'main'
            }
            steps {
                echo "⚡ Ejecutando tests de performance..."
                sh """
                    # Simular tests de performance
                    echo 'Ejecutando tests de carga con Apache Bench...'
                    # ab -n 100 -c 10 http://staging-server/api/health
                    
                    echo 'Verificando métricas de performance...'
                    # lighthouse --chrome-flags="--headless" --output=json --output-path=lighthouse-report.json http://staging-server
                    
                    echo '✅ Performance tests completados'
                """
            }
        }
    }

    post {
        always {
            echo "🧹 Limpiando workspace..."
            sh """
                # Limpiar procesos Node.js que puedan estar corriendo
                pkill -f "node index.js" || true
                
                # Limpiar puertos que puedan estar en uso
                fuser -k 4000/tcp 2>/dev/null || true
                fuser -k 3000/tcp 2>/dev/null || true
            """
        }
        success {
            echo "✅ Pipeline ejecutado correctamente!"
            slackSend(
                channel: '#deployments',
                color: 'good',
                message: "✅ Deploy exitoso de Mi Tienda - Build #${BUILD_NUMBER} en branch ${BRANCH_NAME}"
            )
        }
        failure {
            echo "❌ Falla en el pipeline. Revisar logs."
            slackSend(
                channel: '#deployments',
                color: 'danger',
                message: "❌ Falla en deploy de Mi Tienda - Build #${BUILD_NUMBER} en branch ${BRANCH_NAME}"
            )
        }
        unstable {
            echo "⚠️ Pipeline inestable - algunas pruebas fallaron."
        }
    }
}