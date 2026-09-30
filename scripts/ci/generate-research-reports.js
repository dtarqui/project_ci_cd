const fs = require("fs");
const path = require("path");

// Mismo modulo que usa generate-ci-metrics.js para escribir el historico: asi el
// parser del CSV y la definicion de los indicadores DORA son necesariamente los
// mismos en los dos scripts. Ver el encabezado de lib/metrics-history.js.
const {
  parseCsvRows,
  toNumberOrNull,
  average,
  changeFailureRatePct,
  deploymentFrequency,
} = require("./lib/metrics-history");

const rootDir = path.resolve(__dirname, "..", "..");
const metricsDir = path.join(rootDir, process.env.METRICS_DIR || "docs/metrics");

// La misma carpeta que `metricsDir`, pero escrita como ruta relativa del repositorio:
// es la que se imprime dentro de los reportes. Antes esas rutas iban a mano como
// "docs/metrics/...", asi que un METRICS_DIR distinto generaba reportes que
// apuntaban a una carpeta inexistente.
const metricsDirLabel = (process.env.METRICS_DIR || "docs/metrics").split(path.sep).join("/");

// El historico se llama metrics-history.csv; se acepta el nombre anterior
// (pre-cicd-baseline.csv) para no perder series generadas por versiones previas.
const historyCsvPath = (() => {
  const current = path.join(metricsDir, "metrics-history.csv");
  const legacy = path.join(metricsDir, "pre-cicd-baseline.csv");
  return fs.existsSync(current) || !fs.existsSync(legacy) ? current : legacy;
})();
const comparativeReportPath = path.join(metricsDir, "comparative-before-after.md");
const scrumReportPath = path.join(metricsDir, "scrum-indicators.md");
const methodologyTemplatePath = path.join(metricsDir, "methodology-barriers-template.md");
const sprintDataCsvPath = path.join(metricsDir, "sprint-metrics.csv");
const sprintTemplateCsvPath = path.join(metricsDir, "sprint-metrics-template.csv");

const preProfileName = process.env.PRE_PROFILE || "pre-cicd";
const postProfileName = process.env.POST_PROFILE || "post-cicd";

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function median(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
  }
  return Number(sorted[mid].toFixed(2));
}

function safeDelta(after, before) {
  if (after === null || before === null) {
    return null;
  }
  return Number((after - before).toFixed(2));
}

function safePctDelta(after, before) {
  if (after === null || before === null || before === 0) {
    return null;
  }
  return Number((((after - before) / before) * 100).toFixed(2));
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }
  return String(value);
}

function splitBeforeAfter(rows) {
  const preRows = rows.filter((r) => (r.profile || "") === preProfileName);
  const postRows = rows.filter((r) => (r.profile || "") === postProfileName);

  if (preRows.length && postRows.length) {
    return {
      preRows,
      postRows,
      splitMode: `profile (${preProfileName} vs ${postProfileName})`,
    };
  }

  const half = Math.floor(rows.length / 2);
  return {
    preRows: rows.slice(0, half),
    postRows: rows.slice(half),
    splitMode: "half-split fallback (first half vs second half)",
  };
}

function summarizeRows(rows) {
  const getMetric = (name) => rows.map((r) => toNumberOrNull(r[name])).filter((v) => v !== null);

  const duration = getMetric("durationSeconds");
  const failureRate = getMetric("failureRatePct");
  const frontendCoverage = getMetric("frontendLineCoverage");
  const backendCoverage = getMetric("backendLineCoverage");
  const passRate = getMetric("passRatePct");

  return {
    count: rows.length,
    avgDurationSeconds: average(duration),
    medianDurationSeconds: median(duration),
    avgFailureRatePct: average(failureRate),
    avgFrontendCoveragePct: average(frontendCoverage),
    avgBackendCoveragePct: average(backendCoverage),
    avgPassRatePct: average(passRate),
    changeFailureRatePct: changeFailureRatePct(rows),
    deploymentFrequencyPerWeek: deploymentFrequency(rows).perWeek,
  };
}

function buildComparativeReport(rows) {
  const now = new Date().toISOString();

  if (rows.length < 2) {
    const content = [
      "# Informe Comparativo Cuantitativo (Antes vs Despues)",
      "",
      "No hay suficientes datos historicos en `" + path.basename(historyCsvPath) + "` para calcular comparativos.",
      "Se requieren al menos 2 filas de builds.",
      "",
      `Generado automaticamente: ${now}`,
    ].join("\n");
    fs.writeFileSync(comparativeReportPath, content, "utf8");
    return;
  }

  const { preRows, postRows, splitMode } = splitBeforeAfter(rows);
  const pre = summarizeRows(preRows);
  const post = summarizeRows(postRows);

  const tableRows = [
    {
      metric: "Duracion promedio de build (s)",
      before: pre.avgDurationSeconds,
      after: post.avgDurationSeconds,
      interpretation: "Menor es mejor",
    },
    {
      metric: "Mediana de build (s)",
      before: pre.medianDurationSeconds,
      after: post.medianDurationSeconds,
      interpretation: "Menor es mejor",
    },
    {
      metric: "Tasa promedio de fallos (%)",
      before: pre.avgFailureRatePct,
      after: post.avgFailureRatePct,
      interpretation: "Menor es mejor",
    },
    {
      metric: "Cobertura FE promedio lineas (%)",
      before: pre.avgFrontendCoveragePct,
      after: post.avgFrontendCoveragePct,
      interpretation: "Mayor es mejor",
    },
    {
      metric: "Cobertura BE promedio lineas (%)",
      before: pre.avgBackendCoveragePct,
      after: post.avgBackendCoveragePct,
      interpretation: "Mayor es mejor",
    },
    {
      metric: "Tasa promedio de aprobacion tests (%)",
      before: pre.avgPassRatePct,
      after: post.avgPassRatePct,
      interpretation: "Mayor es mejor",
    },
    {
      metric: "Change Failure Rate - DORA (%)",
      before: pre.changeFailureRatePct,
      after: post.changeFailureRatePct,
      interpretation: "Menor es mejor",
    },
    {
      metric: "Deployment Frequency - DORA (builds exitosos/semana)",
      before: pre.deploymentFrequencyPerWeek,
      after: post.deploymentFrequencyPerWeek,
      interpretation: "Mayor es mejor",
    },
  ];

  const lines = [
    "# Informe Comparativo Cuantitativo (Antes vs Despues)",
    "",
    "Reporte generado automaticamente a partir de `" + path.basename(historyCsvPath) + "`.",
    `Metodo de separacion de periodos: ${splitMode}.`,
    "",
    "## Resumen de muestras",
    `- Builds en periodo antes: ${pre.count}`,
    `- Builds en periodo despues: ${post.count}`,
    "",
    "## Tabla comparativa",
    "| Indicador | Antes | Despues | Delta Absoluto | Delta Relativo (%) | Interpretacion |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const item of tableRows) {
    const absDelta = safeDelta(item.after, item.before);
    const relDelta = safePctDelta(item.after, item.before);
    lines.push(
      `| ${item.metric} | ${formatNumber(item.before)} | ${formatNumber(item.after)} | ${formatNumber(absDelta)} | ${formatNumber(relDelta)} | ${item.interpretation} |`
    );
  }

  lines.push("");
  lines.push("## Conclusiones trazables (plantilla)");
  lines.push("- Hallazgo 1: [Interpretar variacion principal observada en la tabla].");
  lines.push("- Hallazgo 2: [Relacionar cambios con automatizacion CI/CD].");
  lines.push("- Hallazgo 3: [Indicar limitaciones del muestreo o datos faltantes].");
  lines.push("");
  lines.push("## Recomendaciones");
  lines.push("- Mantener un etiquetado de perfil consistente (`pre-cicd` y `post-cicd`) para mejorar la validez del comparativo.");
  lines.push("- Complementar con analisis cualitativo de barreras tecnicas/organizacionales.");
  lines.push("");
  lines.push(`Generado automaticamente: ${now}`);

  fs.writeFileSync(comparativeReportPath, lines.join("\n"), "utf8");
}

function ensureSprintTemplate() {
  if (fs.existsSync(sprintTemplateCsvPath)) {
    return;
  }
  const template = [
    "sprint,leadTimeDays,defects,dodCommitted,dodCompleted,notes",
    "Sprint 1,5,3,10,8,Ejemplo",
    "Sprint 2,4,2,12,11,Ejemplo",
  ].join("\n");
  fs.writeFileSync(sprintTemplateCsvPath, `${template}\n`, "utf8");
}

function ensureMethodologyTemplate() {
  if (fs.existsSync(methodologyTemplatePath)) {
    return;
  }

  const content = [
    "# Apartado Metodologico: Barreras Tecnicas y Organizacionales",
    "",
    "## Objetivo del levantamiento",
    "Describir y analizar barreras para adopcion CI/CD en PyMEs bolivianas de software.",
    "",
    "## Diseno metodologico",
    "- Enfoque: mixto (cuantitativo + cualitativo).",
    "- Tecnicas: encuesta, entrevista semiestructurada, revision documental.",
    "- Unidad de analisis: equipos de desarrollo y/o lideres tecnicos.",
    "",
    "## Instrumentos",
    "### Encuesta",
    "- Poblacion objetivo: [definir].",
    "- Tamano de muestra: [definir].",
    "- Variables: nivel de automatizacion, frecuencia de errores, tiempo de despliegue, cultura DevOps.",
    "- Escala sugerida: Likert 1 a 5.",
    "",
    "### Entrevistas",
    "- Perfil de entrevistados: [definir].",
    "- Numero de entrevistas: [definir].",
    "- Preguntas eje: barreras tecnicas, barreras organizacionales, priorizacion y presupuesto.",
    "",
    "### Revision documental",
    "- Fuentes: retrospectivas SCRUM, incidencias, bitacoras de despliegue, wiki interna.",
    "- Criterios: evidencia de cuellos de botella, retrabajo, dependencia manual.",
    "",
    "## Resultados",
    "### Barreras tecnicas",
    "- [Hallazgo + evidencia].",
    "",
    "### Barreras organizacionales",
    "- [Hallazgo + evidencia].",
    "",
    "### Triangulacion",
    "- [Cruzar encuesta + entrevista + documentos].",
    "",
    "## Validez y limitaciones",
    "- [Sesgos, tamano de muestra, calidad de datos].",
    "",
    "## Trazabilidad",
    `- Vincular hallazgos con \`${metricsDirLabel}/comparative-before-after.md\` y \`${metricsDirLabel}/scrum-indicators.md\`.`,
  ].join("\n");

  fs.writeFileSync(methodologyTemplatePath, `${content}\n`, "utf8");
}

function buildScrumReport() {
  const now = new Date().toISOString();
  const sprintRows = parseCsvRows(sprintDataCsvPath);

  if (!sprintRows.length) {
    const content = [
      "# Indicadores SCRUM Vinculados al Pipeline",
      "",
      `No se encontro \`${metricsDirLabel}/sprint-metrics.csv\`.`,
      "",
      "## Como habilitar este reporte",
      `1. Copiar \`${metricsDirLabel}/sprint-metrics-template.csv\` a \`${metricsDirLabel}/sprint-metrics.csv\`.`,
      "2. Completar datos reales por sprint: `leadTimeDays`, `defects`, `dodCommitted`, `dodCompleted`.",
      "3. Ejecutar nuevamente este script para recalcular indicadores.",
      "",
      "## Indicadores objetivo",
      "- Lead time por sprint (dias).",
      "- Defectos por sprint.",
      "- Cumplimiento de Definition of Done (%).",
      "",
      `Generado automaticamente: ${now}`,
    ].join("\n");

    fs.writeFileSync(scrumReportPath, content, "utf8");
    return;
  }

  const leadTimes = sprintRows
    .map((r) => toNumberOrNull(r.leadTimeDays))
    .filter((v) => v !== null);
  const defects = sprintRows
    .map((r) => toNumberOrNull(r.defects))
    .filter((v) => v !== null);

  const dodComplianceBySprint = sprintRows
    .map((r) => {
      const committed = toNumberOrNull(r.dodCommitted);
      const completed = toNumberOrNull(r.dodCompleted);
      if (committed === null || completed === null || committed === 0) {
        return null;
      }
      return Number(((completed / committed) * 100).toFixed(2));
    })
    .filter((v) => v !== null);

  const avgLeadTime = average(leadTimes);
  const avgDefects = average(defects);
  const avgDodCompliance = average(dodComplianceBySprint);

  const lines = [
    "# Indicadores SCRUM Vinculados al Pipeline",
    "",
    `Reporte generado automaticamente desde \`${metricsDirLabel}/sprint-metrics.csv\`.`,
    "",
    "## Resumen global",
    `- Total sprints analizados: ${sprintRows.length}`,
    `- Lead time promedio por sprint (dias): ${formatNumber(avgLeadTime)}`,
    `- Defectos promedio por sprint: ${formatNumber(avgDefects)}`,
    `- Cumplimiento promedio Definition of Done (%): ${formatNumber(avgDodCompliance)}`,
    "",
    "## Detalle por sprint",
    "| Sprint | Lead Time (dias) | Defectos | DoD comprometido | DoD completado | Cumplimiento DoD (%) |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const row of sprintRows) {
    const committed = toNumberOrNull(row.dodCommitted);
    const completed = toNumberOrNull(row.dodCompleted);
    const dodCompliance = committed && committed > 0
      ? Number(((completed / committed) * 100).toFixed(2))
      : null;

    lines.push(
      `| ${row.sprint || "N/A"} | ${formatNumber(toNumberOrNull(row.leadTimeDays))} | ${formatNumber(toNumberOrNull(row.defects))} | ${formatNumber(committed)} | ${formatNumber(completed)} | ${formatNumber(dodCompliance)} |`
    );
  }

  lines.push("");
  lines.push("## Interpretacion (plantilla)");
  lines.push("- Lead time: [explicar tendencia y posibles cuellos de botella].");
  lines.push("- Defectos por sprint: [explicar reduccion/incremento y causa probable].");
  lines.push("- DoD: [explicar disciplina de cierre y estabilidad del proceso].");
  lines.push("");
  lines.push(`Generado automaticamente: ${now}`);

  fs.writeFileSync(scrumReportPath, lines.join("\n"), "utf8");
}

function main() {
  ensureDir(metricsDir);
  ensureSprintTemplate();
  ensureMethodologyTemplate();

  const baselineRows = parseCsvRows(historyCsvPath);
  buildComparativeReport(baselineRows);
  buildScrumReport();

  console.log(`[research] Reporte comparativo: ${comparativeReportPath}`);
  console.log(`[research] Reporte SCRUM: ${scrumReportPath}`);
  console.log(`[research] Template metodologia: ${methodologyTemplatePath}`);
  console.log(`[research] Template sprints: ${sprintTemplateCsvPath}`);
}

main();
