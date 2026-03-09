# Metricas CI/CD Automatizadas

Este directorio guarda salidas de metricas generadas automaticamente por Jenkins y por los scripts de `scripts/ci/`.

## Archivos principales
- `pre-cicd-baseline.csv`: historico acumulado por build.
- `pre-cicd-baseline.md`: resumen legible del ultimo build.
- `build-metrics-<BUILD_NUMBER>.json`: detalle tecnico de una ejecucion.
- `comparative-before-after.md`: comparativo cuantitativo antes vs despues.
- `scrum-indicators.md`: indicadores SCRUM calculados desde datos de sprint.
- `methodology-barriers-template.md`: plantilla metodologica para barreras tecnicas/organizacionales.
- `sprint-metrics-template.csv`: plantilla base para capturar metricas por sprint.
- `sprint-metrics.csv`: dataset editable para analisis SCRUM (si no existe, se toma plantilla).

## Generacion en pipeline
En `Jenkinsfile`, bloque `post { always { ... } }`:
- Ejecuta `node scripts/ci/generate-ci-metrics.js`.
- Ejecuta `node scripts/ci/generate-research-reports.js`.
- Archiva los reportes resultantes como artefactos de build.

## Fuentes de datos
Los scripts consumen:
- Resultados de tests JUnit:
  - `frontend/junit.xml`
  - `backend/junit.xml`
- Resumenes de cobertura:
  - `frontend/coverage/coverage-summary.json`
  - `backend/coverage/coverage-summary.json`
- Variables de entorno CI: `BUILD_NUMBER`, `JOB_NAME`, `BUILD_URL`, `GIT_COMMIT_SHORT`, `GIT_AUTHOR`, `BUILD_DURATION_SECONDS`, `BUILD_STATUS`, `METRICS_PROFILE`, `COVERAGE_THRESHOLD`.

## Modo comparativo antes vs despues
- Fuente base: `pre-cicd-baseline.csv`.
- Si hay perfiles `pre-cicd` y `post-cicd`, compara por perfil.
- Si no, usa division por mitades (primera mitad vs segunda mitad).
- Reporta deltas absolutos y relativos para duracion, fallos, pass rate y cobertura.

## Indicadores SCRUM
`scrum-indicators.md` se calcula desde `sprint-metrics.csv` con columnas:
- `sprint`
- `leadTimeDays`
- `defects`
- `dodCommitted`
- `dodCompleted`
- `notes`

Indicadores calculados:
- Lead time promedio.
- Defectos promedio por sprint.
- Cumplimiento promedio de Definition of Done.

## Metricas que se reportan
- Duracion total del build y duracion de tests FE/BE.
- Tests totales, fallidos, omitidos, pass rate y failure rate.
- Cobertura FE/BE por `lines`, `statements`, `branches`, `functions`.
- Gap de cobertura respecto a `COVERAGE_THRESHOLD`.
- Ranking de archivos con menor cobertura.
- Deltas contra build previo y promedio movil.

## Ejecucion manual (opcional)
Desde la raiz del repo:

```bash
node scripts/ci/generate-ci-metrics.js
node scripts/ci/generate-research-reports.js
```

Esto permite regenerar reportes localmente si ya existen archivos de test/coverage.
