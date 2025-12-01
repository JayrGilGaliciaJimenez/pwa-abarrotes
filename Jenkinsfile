pipeline {
    agent any

    environment {
        COMPOSE_PROJECT = "app_abarrotes"
        PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:${env.PATH}"
    }

    stages {
        stage('Verificar Docker') {
            steps {
                sh '''
                    set -e
                    docker --version || echo "Docker no está disponible"
                '''
            }
        }

        stage('Parando los servicios...') {
            steps {
                sh '''
                    set -e
                    docker compose -p ${COMPOSE_PROJECT} down || true
                '''
            }
        }

        stage('Eliminando las imágenes anteriores...') {
            steps {
                sh '''
                    set -e
                    IMAGES=$(docker images --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" -q)
                    if [ -n "$IMAGES" ]; then
                        docker rmi -f $IMAGES
                    else
                        echo "No hay imágenes por eliminar"
                    fi
                '''
            }
        }

        stage('Obteniendo actualización...') {
            steps {
                checkout scm
            }
        }

        stage('Construyendo y desplegando servicios...') {
            steps {
                sh '''
                    set -e
                    docker compose -p ${COMPOSE_PROJECT} up --build -d
                '''
            }
        }
    }

    post {
        success {
            echo 'Pipeline ejecutado con éxito'
        }
        failure {
            echo 'Hubo un error al ejecutar el pipeline'
        }
        always {
            echo 'Pipeline finalizado'
        }
    }
}
