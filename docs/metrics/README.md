# Metricas CI/CD Automatizadas

Este directorio contiene la linea base automatica generada por Jenkins en cada ejecucion del pipeline.

## Archivos generados
- `pre-cicd-baseline.csv`: historico acumulado por build.
- `pre-cicd-baseline.md`: resumen del ultimo build.
- `build-metrics-<BUILD_NUMBER>.json`: detalle completo por ejecucion.
- `comparative-before-after.md`: comparativo cuantitativo automatizado antes vs despues.
- `scrum-indicators.md`: indicadores SCRUM (lead time, defectos/sprint, cumplimiento DoD).
- `methodology-barriers-template.md`: plantilla metodologica para barreras tecnicas/organizacionales.
- `sprint-metrics-template.csv`: plantilla para capturar datos por sprint.

## Como se genera
- Jenkins ejecuta `scripts/ci/generate-ci-metrics.js` en el bloque `post { always { ... } }`.
- Jenkins ejecuta `scripts/ci/generate-research-reports.js` para producir reportes academicos trazables.
- El script lee:
  - `frontend/junit.xml`, `backend/junit.xml`
  - `frontend/coverage/coverage-summary.json`, `backend/coverage/coverage-summary.json`
  - Variables del build (`BUILD_NUMBER`, `JOB_NAME`, `BUILD_URL`, estado y duracion)

## Reporte comparativo antes vs despues
- Fuente: `pre-cicd-baseline.csv`.
- Si existen perfiles `pre-cicd` y `post-cicd`, el comparativo usa esos grupos.
- Si no existen ambos perfiles, usa un split por mitades (primera mitad vs segunda mitad).
- Incluye tabla con deltas absolutos/relativos y plantilla de conclusiones trazables.

## Indicadores SCRUM
- Fuente principal: `sprint-metrics.csv` (si no existe, se genera plantilla base).
- Campos esperados: `sprint`, `leadTimeDays`, `defects`, `dodCommitted`, `dodCompleted`, `notes`.
- Indicadores calculados:
  - Lead time promedio por sprint (dias).
  - Defectos promedio por sprint.
  - Cumplimiento promedio Definition of Done (%).

## Metricas incluidas
- Duracion total del build (segundos)
- Duracion por etapa de tests (frontend/backend)
- Tests totales, fallidos y omitidos
- Tests aprobados y tasas (aprobacion/fallo/omitidos)
- Tasa de fallos (%)
- Cobertura frontend/backend por lineas, statements, branches y functions
- Gap de cobertura contra objetivo (`COVERAGE_THRESHOLD`)
- Top de archivos con menor cobertura por frontend/backend
- Detalle de suites y casos fallidos (cuando existan)
- Deltas contra build previo y promedio movil de 5 builds
- Commit y autor

## Nota
Si ejecutas el pipeline por primera vez, Jenkins creara los archivos automaticamente aunque no existan en el repositorio.
