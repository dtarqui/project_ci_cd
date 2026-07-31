FROM jenkins/jenkins:lts-jdk17

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
# 'Node18' (nombre que exige el Jenkinsfile) quedan definidos por casc.yaml.
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
ENV CASC_JENKINS_CONFIG="/usr/share/jenkins/ref/casc.yaml"

USER jenkins
