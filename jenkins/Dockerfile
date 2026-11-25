# Imagen fijada por version y digest: Jenkins 2.541.3 LTS con Java 17, la que
# uso la serie de validacion (ejecuciones n.o 37 a 47). La etiqueta lts-jdk17
# cambia con cada LTS nueva y no permite reconstruir ese entorno.
FROM jenkins/jenkins:2.541.3-lts-jdk17@sha256:cce1eeb79902722f3cf7a8831c41e95c39f4a42b9a2981959630cc66539b3c2d

USER root

# git: usado por el checkout del pipeline. curl: usado por el stage de
# healthcheck del backend (Jenkinsfile linea ~490).
RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl \
    && rm -rf /var/lib/apt/lists/*

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

COPY casc.yaml /usr/share/jenkins/ref/casc.yaml

# Salta el wizard de setup inicial: la identidad de admin y el tool NodeJS
# 'Node24' (nombre que exige el Jenkinsfile) quedan definidos por casc.yaml.
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
ENV CASC_JENKINS_CONFIG="/usr/share/jenkins/ref/casc.yaml"

USER jenkins
