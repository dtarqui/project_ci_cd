const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const metricsDir = path.join(rootDir, process.env.METRICS_DIR || "docs/metrics");

const buildNumber = process.env.BUILD_NUMBER || "local";
const jobName = process.env.JOB_NAME || "local-job";
const buildUrl = process.env.BUILD_URL || "";
const commit = process.env.GIT_COMMIT_SHORT || "N/A";
const author = process.env.GIT_AUTHOR || "N/A";
const result = process.env.BUILD_STATUS || process.env.currentBuildResult || "UNKNOWN";
const profile = process.env.METRICS_PROFILE || "pre-cicd";
const durationSeconds = Number(process.env.BUILD_DURATION_SECONDS || 0);
const frontendTestDurationSeconds = Number(process.env.FRONTEND_TEST_DURATION_SECONDS || 0);
const backendTestDurationSeconds = Number(process.env.BACKEND_TEST_DURATION_SECONDS || 0);
const timestamp = new Date().toISOString();
const LOW_COVERAGE_LIMIT = 10;

// El objetivo de cobertura real es el que cada proyecto ya exige en su propio
// jest.config.js (distinto por metrica y por frontend/backend). Antes este
// script usaba un unico COVERAGE_THRESHOLD (env var, ej. 85) desconectado de
// esos valores reales -- ademas de comparar solo "lines", lo que producia un
// "objetivo" que no correspondia a nada realmente exigido por los tests.
function readCoverageThresholds(projectDir) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const config = require(path.join(projectDir, "jest.config.js"));
    const g = (config && config.coverageThreshold && config.coverageThreshold.global) || {};
    return {
      lines: typeof g.lines === "number" ? g.lines : null,
      statements: typeof g.statements === "number" ? g.statements : null,
      branches: typeof g.branches === "number" ? g.branches : null,
      functions: typeof g.functions === "number" ? g.functions : null,
    };
  } catch (_err) {
    return { lines: null, statements: null, branches: null, functions: null };
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_err) {
    return null;
  }
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (_err) {
    return "";
  }
}

function pctFromCoverageSummary(summary, key = "lines") {
  const metric = summary && summary.total && summary.total[key];
  if (!metric || typeof metric.pct !== "number") {
    return null;
  }
  return Number(metric.pct.toFixed(2));
}

function metricFromCoverageSummary(summary, key) {
  const metric = summary && summary.total && summary.total[key];
  if (!metric) {
    return {
      pct: null,
      covered: null,
      total: null,
      skipped: null,
    };
  }
  return {
    pct: typeof metric.pct === "number" ? Number(metric.pct.toFixed(2)) : null,
    covered: typeof metric.covered === "number" ? metric.covered : null,
    total: typeof metric.total === "number" ? metric.total : null,
    skipped: typeof metric.skipped === "number" ? metric.skipped : null,
  };
}

function parseJUnit(xmlPath) {
  if (!fs.existsSync(xmlPath)) {
    return {
      tests: 0,
      failures: 0,
      skipped: 0,
      durationSeconds: 0,
      suites: [],
      failedTestcases: [],
    };
  }

  const xml = fs.readFileSync(xmlPath, "utf8");

  const rootTests = Number((xml.match(/<testsuites[^>]*\stests="(\d+)"/) || [])[1] || 0);
  const rootFailures = Number((xml.match(/<testsuites[^>]*\sfailures="(\d+)"/) || [])[1] || 0);
  const rootSkipped = Number((xml.match(/<testsuites[^>]*\sskipped="(\d+)"/) || [])[1] || 0);
  const rootTime = Number((xml.match(/<testsuites[^>]*\stime="([0-9.]+)"/) || [])[1] || 0);

  const suites = [];
  const suiteTagRegex = /<testsuite\b([^>]*)>/g;
  let suiteMatch = suiteTagRegex.exec(xml);
  while (suiteMatch) {
    const attrs = suiteMatch[1] || "";
    const name = (attrs.match(/\sname="([^"]*)"/) || [])[1] || "unnamed-suite";
    const tests = Number((attrs.match(/\stests="(\d+)"/) || [])[1] || 0);
    const failures = Number((attrs.match(/\sfailures="(\d+)"/) || [])[1] || 0);
    const skipped = Number((attrs.match(/\sskipped="(\d+)"/) || [])[1] || 0);
    const time = Number((attrs.match(/\stime="([0-9.]+)"/) || [])[1] || 0);
    suites.push({ name, tests, failures, skipped, durationSeconds: time });
    suiteMatch = suiteTagRegex.exec(xml);
  }

  const failedTestcases = [];
  const testcaseRegex = /<testcase\b([^>]*)>([\s\S]*?)<\/testcase>/g;
  let testcaseMatch = testcaseRegex.exec(xml);
  while (testcaseMatch) {
    const attrs = testcaseMatch[1] || "";
    const body = testcaseMatch[2] || "";
    if (body.includes("<failure") || body.includes("<error")) {
      const classname = (attrs.match(/\sclassname="([^"]*)"/) || [])[1] || "unknown-class";
      const name = (attrs.match(/\sname="([^"]*)"/) || [])[1] || "unknown-test";
      const time = Number((attrs.match(/\stime="([0-9.]+)"/) || [])[1] || 0);
      const message =
        (body.match(/<failure[^>]*\smessage="([^"]*)"/) || [])[1] ||
        (body.match(/<error[^>]*\smessage="([^"]*)"/) || [])[1] ||
        "Failure without message";
      failedTestcases.push({ classname, name, durationSeconds: time, message });
    }
    testcaseMatch = testcaseRegex.exec(xml);
  }

  const tests = rootTests || suites.reduce((acc, s) => acc + s.tests, 0);
  const failures = rootFailures || suites.reduce((acc, s) => acc + s.failures, 0);
  const skipped = rootSkipped || suites.reduce((acc, s) => acc + s.skipped, 0);
  const durationFromSuites = suites.reduce((acc, s) => acc + s.durationSeconds, 0);

  return {
    tests,
    failures,
    skipped,
    durationSeconds: rootTime || durationFromSuites,
    suites,
    failedTestcases,
  };
}

function toCsvValue(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function buildCoverageFileRanking(coverageSummary, projectDir, limit = LOW_COVERAGE_LIMIT) {
  if (!coverageSummary || typeof coverageSummary !== "object") {
    return [];
  }

  const ranking = [];
  for (const [filePath, metrics] of Object.entries(coverageSummary)) {
    if (filePath === "total") {
      continue;
    }
    const lines = metrics && metrics.lines;
    if (!lines || typeof lines.pct !== "number") {
      continue;
    }
    // coverage-summary.json guarda rutas absolutas del entorno donde corrio
    // Jest; se muestran relativas al proyecto para que el reporte sea legible
    // y portable entre maquinas/agentes de CI.
    ranking.push({
      file: path.relative(projectDir, filePath).split(path.sep).join("/"),
      lineCoveragePct: Number(lines.pct.toFixed(2)),
      coveredLines: lines.covered,
      totalLines: lines.total,
      uncoveredLines: Math.max((lines.total || 0) - (lines.covered || 0), 0),
    });
  }

  ranking.sort((a, b) => {
    if (a.lineCoveragePct !== b.lineCoveragePct) {
      return a.lineCoveragePct - b.lineCoveragePct;
    }
    return b.uncoveredLines - a.uncoveredLines;
  });

  return ranking.slice(0, limit);
}

function parseCsvRows(csvPath) {
  if (!fs.existsSync(csvPath)) {
    return [];
  }
  const raw = readTextIfExists(csvPath).trim();
  if (!raw) {
    return [];
  }

  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(",");
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cols[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function average(values) {
  if (!values.length) {
    return null;
  }
  const total = values.reduce((acc, n) => acc + n, 0);
  return Number((total / values.length).toFixed(2));
}

function safeDelta(current, previous) {
  if (current === null || previous === null) {
    return null;
  }
  return Number((current - previous).toFixed(2));
}

ensureDir(metricsDir);

const frontendCoveragePath = path.join(rootDir, "frontend", "coverage", "coverage-summary.json");
const backendCoveragePath = path.join(rootDir, "backend", "coverage", "coverage-summary.json");

const frontendCoverageSummary = readJsonIfExists(frontendCoveragePath);
const backendCoverageSummary = readJsonIfExists(backendCoveragePath);

const frontendLineCoverage = pctFromCoverageSummary(frontendCoverageSummary, "lines");
const backendLineCoverage = pctFromCoverageSummary(backendCoverageSummary, "lines");

const frontendCoverage = {
  lines: metricFromCoverageSummary(frontendCoverageSummary, "lines"),
  statements: metricFromCoverageSummary(frontendCoverageSummary, "statements"),
  branches: metricFromCoverageSummary(frontendCoverageSummary, "branches"),
  functions: metricFromCoverageSummary(frontendCoverageSummary, "functions"),
};

const backendCoverage = {
  lines: metricFromCoverageSummary(backendCoverageSummary, "lines"),
  statements: metricFromCoverageSummary(backendCoverageSummary, "statements"),
  branches: metricFromCoverageSummary(backendCoverageSummary, "branches"),
  functions: metricFromCoverageSummary(backendCoverageSummary, "functions"),
};

const lowCoverageFrontendFiles = buildCoverageFileRanking(
  frontendCoverageSummary,
  path.join(rootDir, "frontend")
);
const lowCoverageBackendFiles = buildCoverageFileRanking(
  backendCoverageSummary,
  path.join(rootDir, "backend")
);

const frontendThresholds = readCoverageThresholds(path.join(rootDir, "frontend"));
const backendThresholds = readCoverageThresholds(path.join(rootDir, "backend"));

const frontendJunit = parseJUnit(path.join(rootDir, "frontend", "junit.xml"));
const backendJunit = parseJUnit(path.join(rootDir, "backend", "junit.xml"));

const totalTests = frontendJunit.tests + backendJunit.tests;
const failedTests = frontendJunit.failures + backendJunit.failures;
const skippedTests = frontendJunit.skipped + backendJunit.skipped;
const passedTests = Math.max(totalTests - failedTests - skippedTests, 0);
const failureRatePct = totalTests > 0 ? Number(((failedTests / totalTests) * 100).toFixed(2)) : 0;
const passRatePct = totalTests > 0 ? Number(((passedTests / totalTests) * 100).toFixed(2)) : 0;
const skippedRatePct = totalTests > 0 ? Number(((skippedTests / totalTests) * 100).toFixed(2)) : 0;

const frontendSuiteCount = frontendJunit.suites.length;
const backendSuiteCount = backendJunit.suites.length;
const totalSuites = frontendSuiteCount + backendSuiteCount;

const frontendFailedTestcases = frontendJunit.failedTestcases;
const backendFailedTestcases = backendJunit.failedTestcases;

// Delta = cobertura real - objetivo real de CADA proyecto (leido de su propio
// jest.config.js). Positivo o cero = cumple/supera el objetivo; negativo =
// por debajo. (Antes era "objetivo - real", asi que superar el objetivo daba
// un numero negativo que parecia una falla cuando en realidad era algo bueno.)
function coverageDelta(actualPct, thresholdPct) {
  if (actualPct === null || thresholdPct === null) {
    return null;
  }
  return Number((actualPct - thresholdPct).toFixed(2));
}

function meetsAllThresholds(coverage, thresholds) {
  const keys = ["lines", "statements", "branches", "functions"];
  const comparable = keys.filter((k) => thresholds[k] !== null && coverage[k].pct !== null);
  if (!comparable.length) {
    return null;
  }
  return comparable.every((k) => coverage[k].pct >= thresholds[k]);
}

const frontendTests = frontendJunit.tests;
const backendTests = backendJunit.tests;

const frontendLinesDeltaVsThreshold = coverageDelta(frontendCoverage.lines.pct, frontendThresholds.lines);
const backendLinesDeltaVsThreshold = coverageDelta(backendCoverage.lines.pct, backendThresholds.lines);
const frontendMeetsThreshold = meetsAllThresholds(frontendCoverage, frontendThresholds);
const backendMeetsThreshold = meetsAllThresholds(backendCoverage, backendThresholds);

const row = {
  timestamp,
  profile,
  buildNumber,
  jobName,
  result,
  durationSeconds,
  frontendTestDurationSeconds,
  backendTestDurationSeconds,
  totalTests,
  frontendTests,
  backendTests,
  passedTests,
  failedTests,
  skippedTests,
  failureRatePct,
  passRatePct,
  skippedRatePct,
  totalSuites,
  frontendSuiteCount,
  backendSuiteCount,
  frontendLineCoverage,
  backendLineCoverage,
  frontendStatementCoverage: frontendCoverage.statements.pct,
  frontendBranchCoverage: frontendCoverage.branches.pct,
  frontendFunctionCoverage: frontendCoverage.functions.pct,
  backendStatementCoverage: backendCoverage.statements.pct,
  backendBranchCoverage: backendCoverage.branches.pct,
  backendFunctionCoverage: backendCoverage.functions.pct,
  frontendLinesThreshold: frontendThresholds.lines,
  backendLinesThreshold: backendThresholds.lines,
  frontendLinesDeltaVsThreshold,
  backendLinesDeltaVsThreshold,
  frontendMeetsThreshold,
  backendMeetsThreshold,
  commit,
  author,
  buildUrl,
};

// Deployment Frequency y Change Failure Rate son 2 de las 4 metricas DORA
// (indicadores estandar de la industria/academia para medir si un pipeline
// de CI/CD realmente mejora la entrega de software). Se calculan aqui porque
// ya tenemos todo lo necesario acumulado en el historico: no requieren
// instrumentacion nueva, solo leer `result` y `timestamp` de cada build.
function computeChangeFailureRatePct(rows) {
  const withResult = rows.filter((r) => r.result);
  if (!withResult.length) {
    return null;
  }
  const failed = withResult.filter((r) => /fail/i.test(r.result)).length;
  return Number(((failed / withResult.length) * 100).toFixed(2));
}

function computeDeploymentFrequency(rows) {
  const successfulBuilds = rows.filter((r) => r.result && /success/i.test(r.result)).length;
  const timestamps = rows.map((r) => new Date(r.timestamp).getTime()).filter((t) => Number.isFinite(t));
  const daysObserved =
    timestamps.length >= 2
      ? Math.max(1, Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 86400000))
      : 1;
  return {
    successfulBuilds,
    daysObserved,
    perWeek: successfulBuilds > 0 ? Number(((successfulBuilds / daysObserved) * 7).toFixed(2)) : 0,
  };
}

const csvPath = path.join(metricsDir, "pre-cicd-baseline.csv");
const historicalRows = parseCsvRows(csvPath);
const previous = historicalRows.length ? historicalRows[historicalRows.length - 1] : null;

const allBuildsIncludingCurrent = [...historicalRows, row];
const changeFailureRatePct = computeChangeFailureRatePct(allBuildsIncludingCurrent);
const deploymentFrequency = computeDeploymentFrequency(allBuildsIncludingCurrent);

const previousDuration = previous ? toNumberOrNull(previous.durationSeconds) : null;
const previousFailureRate = previous ? toNumberOrNull(previous.failureRatePct) : null;
const previousFrontendCoverage = previous ? toNumberOrNull(previous.frontendLineCoverage) : null;
const previousBackendCoverage = previous ? toNumberOrNull(previous.backendLineCoverage) : null;

const last5 = historicalRows.slice(-5);
const rolling5AvgDurationSeconds = average(
  last5.map((r) => toNumberOrNull(r.durationSeconds)).filter((v) => v !== null)
);
const rolling5AvgFailureRatePct = average(
  last5.map((r) => toNumberOrNull(r.failureRatePct)).filter((v) => v !== null)
);
const rolling5AvgFrontendLineCoverage = average(
  last5.map((r) => toNumberOrNull(r.frontendLineCoverage)).filter((v) => v !== null)
);
const rolling5AvgBackendLineCoverage = average(
  last5.map((r) => toNumberOrNull(r.backendLineCoverage)).filter((v) => v !== null)
);

row.deltaDurationSeconds = safeDelta(durationSeconds, previousDuration);
row.deltaFailureRatePct = safeDelta(failureRatePct, previousFailureRate);
row.deltaFrontendLineCoverage = safeDelta(frontendLineCoverage, previousFrontendCoverage);
row.deltaBackendLineCoverage = safeDelta(backendLineCoverage, previousBackendCoverage);
row.rolling5AvgDurationSeconds = rolling5AvgDurationSeconds;
row.rolling5AvgFailureRatePct = rolling5AvgFailureRatePct;
row.rolling5AvgFrontendLineCoverage = rolling5AvgFrontendLineCoverage;
row.rolling5AvgBackendLineCoverage = rolling5AvgBackendLineCoverage;

const jsonPath = path.join(metricsDir, `build-metrics-${buildNumber}.json`);
const detailedPayload = {
  build: row,
  testBreakdown: {
    frontend: {
      tests: frontendJunit.tests,
      failures: frontendJunit.failures,
      skipped: frontendJunit.skipped,
      passed: Math.max(frontendJunit.tests - frontendJunit.failures - frontendJunit.skipped, 0),
      durationSeconds: frontendJunit.durationSeconds,
      suites: frontendJunit.suites,
      failedTestcases: frontendFailedTestcases,
    },
    backend: {
      tests: backendJunit.tests,
      failures: backendJunit.failures,
      skipped: backendJunit.skipped,
      passed: Math.max(backendJunit.tests - backendJunit.failures - backendJunit.skipped, 0),
      durationSeconds: backendJunit.durationSeconds,
      suites: backendJunit.suites,
      failedTestcases: backendFailedTestcases,
    },
  },
  coverageBreakdown: {
    frontend: {
      ...frontendCoverage,
      thresholds: frontendThresholds,
      meetsThreshold: frontendMeetsThreshold,
      lowCoverageFiles: lowCoverageFrontendFiles,
    },
    backend: {
      ...backendCoverage,
      thresholds: backendThresholds,
      meetsThreshold: backendMeetsThreshold,
      lowCoverageFiles: lowCoverageBackendFiles,
    },
  },
  doraLite: {
    changeFailureRatePct,
    deploymentFrequency,
  },
  trend: {
    previousBuild: {
      durationSeconds: previousDuration,
      failureRatePct: previousFailureRate,
      frontendLineCoverage: previousFrontendCoverage,
      backendLineCoverage: previousBackendCoverage,
    },
    deltas: {
      durationSeconds: row.deltaDurationSeconds,
      failureRatePct: row.deltaFailureRatePct,
      frontendLineCoverage: row.deltaFrontendLineCoverage,
      backendLineCoverage: row.deltaBackendLineCoverage,
    },
    rolling5BuildAverage: {
      durationSeconds: rolling5AvgDurationSeconds,
      failureRatePct: rolling5AvgFailureRatePct,
      frontendLineCoverage: rolling5AvgFrontendLineCoverage,
      backendLineCoverage: rolling5AvgBackendLineCoverage,
    },
  },
};
fs.writeFileSync(jsonPath, JSON.stringify(detailedPayload, null, 2), "utf8");

const headers = [
  "timestamp",
  "profile",
  "buildNumber",
  "jobName",
  "result",
  "durationSeconds",
  "frontendTestDurationSeconds",
  "backendTestDurationSeconds",
  "totalTests",
  "frontendTests",
  "backendTests",
  "passedTests",
  "failedTests",
  "skippedTests",
  "failureRatePct",
  "passRatePct",
  "skippedRatePct",
  "totalSuites",
  "frontendSuiteCount",
  "backendSuiteCount",
  "frontendLineCoverage",
  "backendLineCoverage",
  "frontendStatementCoverage",
  "frontendBranchCoverage",
  "frontendFunctionCoverage",
  "backendStatementCoverage",
  "backendBranchCoverage",
  "backendFunctionCoverage",
  "frontendLinesThreshold",
  "backendLinesThreshold",
  "frontendLinesDeltaVsThreshold",
  "backendLinesDeltaVsThreshold",
  "frontendMeetsThreshold",
  "backendMeetsThreshold",
  "deltaDurationSeconds",
  "deltaFailureRatePct",
  "deltaFrontendLineCoverage",
  "deltaBackendLineCoverage",
  "rolling5AvgDurationSeconds",
  "rolling5AvgFailureRatePct",
  "rolling5AvgFrontendLineCoverage",
  "rolling5AvgBackendLineCoverage",
  "commit",
  "author",
  "buildUrl",
];

const csvLine = headers.map((key) => toCsvValue(row[key])).join(",");
if (!fs.existsSync(csvPath)) {
  fs.writeFileSync(csvPath, `${headers.join(",")}\n${csvLine}\n`, "utf8");
} else {
  const existing = readTextIfExists(csvPath);
  const firstLine = (existing.split(/\r?\n/)[0] || "").trim();
  const newHeader = headers.join(",");
  if (firstLine !== newHeader) {
    const backupPath = path.join(metricsDir, `pre-cicd-baseline-legacy-${Date.now()}.csv`);
    fs.copyFileSync(csvPath, backupPath);
    fs.writeFileSync(csvPath, `${newHeader}\n${csvLine}\n`, "utf8");
  } else {
    fs.appendFileSync(csvPath, `${csvLine}\n`, "utf8");
  }
}

function verdictIcon(meets) {
  if (meets === null) {
    return "⬜";
  }
  return meets ? "✅" : "⚠️";
}

function formatDelta(delta) {
  if (delta === null) {
    return "N/A";
  }
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} pts`;
}

const isFirstBuild = historicalRows.length === 0;
const trendNote = isFirstBuild ? " _(N/A: este es el primer build registrado, aun no hay build previo con que comparar)_" : "";

const mdPath = path.join(metricsDir, "pre-cicd-baseline.md");
const md = [
  "# Metricas Pre-CI/CD",
  "",
  "Este archivo se actualiza automaticamente en Jenkins al finalizar cada build.",
  "Guia de lectura completa en `docs/metrics/README.md`.",
  "",
  `- Ultima actualizacion: ${timestamp}`,
  `- Build: #${buildNumber}`,
  `- Resultado: ${result}`,
  `- Duracion total (s): ${durationSeconds}`,
  `- Duracion tests frontend (s): ${frontendTestDurationSeconds}`,
  `- Duracion tests backend (s): ${backendTestDurationSeconds}`,
  `- Tests totales: ${totalTests} (frontend: ${frontendTests}, backend: ${backendTests})`,
  `- Tests aprobados: ${passedTests}`,
  `- Tests fallidos: ${failedTests}`,
  `- Tests omitidos: ${skippedTests}`,
  `- Tasa de aprobacion (%): ${passRatePct}`,
  `- Tasa de fallos (%): ${failureRatePct}`,
  `- Tasa de omitidos (%): ${skippedRatePct}`,
  `- Archivos de prueba ejecutados: ${totalSuites} (frontend: ${frontendSuiteCount}, backend: ${backendSuiteCount})`,
  "",
  "## Cobertura (vs. objetivo real de cada jest.config.js)",
  `${verdictIcon(frontendMeetsThreshold)} **Frontend** — lineas ${frontendLineCoverage ?? "N/A"}% / objetivo ${frontendThresholds.lines ?? "N/A"}% (${formatDelta(frontendLinesDeltaVsThreshold)})`,
  `  - statements/branches/functions (%): ${frontendCoverage.statements.pct ?? "N/A"} / ${frontendCoverage.branches.pct ?? "N/A"} / ${frontendCoverage.functions.pct ?? "N/A"}`,
  `${verdictIcon(backendMeetsThreshold)} **Backend** — lineas ${backendLineCoverage ?? "N/A"}% / objetivo ${backendThresholds.lines ?? "N/A"}% (${formatDelta(backendLinesDeltaVsThreshold)})`,
  `  - statements/branches/functions (%): ${backendCoverage.statements.pct ?? "N/A"} / ${backendCoverage.branches.pct ?? "N/A"} / ${backendCoverage.functions.pct ?? "N/A"}`,
  "",
  "_Nota: el pipeline desactiva el fallo automatico de Jest por cobertura (`--coverageThreshold='{}'`) para poder generar reportes aun si no se alcanza el objetivo; los ✅/⚠️ de arriba son quien realmente indica si se cumplio._",
  "",
  "## Indicadores estilo DORA (calculados del historico acumulado)",
  `- Change Failure Rate — builds fallidos / total (%): ${changeFailureRatePct ?? "N/A"} _(menor es mejor; mide que tan seguido un cambio rompe el pipeline)_`,
  `- Deployment Frequency — builds exitosos: ${deploymentFrequency.successfulBuilds} en ${deploymentFrequency.daysObserved} dia(s) analizados (~${deploymentFrequency.perWeek}/semana) _(mayor es mejor; mide que tan seguido se entrega software funcionando)_`,
  "",
  "## Tendencia (comparativo vs. build anterior)",
  `- Delta duracion total (s): ${row.deltaDurationSeconds ?? "N/A"}${trendNote}`,
  `- Delta tasa de fallos (%): ${row.deltaFailureRatePct ?? "N/A"}${trendNote}`,
  `- Delta cobertura frontend lineas (%): ${row.deltaFrontendLineCoverage ?? "N/A"}${trendNote}`,
  `- Delta cobertura backend lineas (%): ${row.deltaBackendLineCoverage ?? "N/A"}${trendNote}`,
  `- Promedio movil 5 builds (duracion s): ${rolling5AvgDurationSeconds ?? "N/A"}`,
  `- Promedio movil 5 builds (fallos %): ${rolling5AvgFailureRatePct ?? "N/A"}`,
  "",
  "## Archivos con menor cobertura de lineas",
  "### Frontend",
  ...(
    lowCoverageFrontendFiles.length
      ? lowCoverageFrontendFiles.map(
          (f, idx) => `${idx + 1}. ${f.file} -> ${f.lineCoveragePct}% (${f.coveredLines}/${f.totalLines})`
        )
      : ["- N/A"]
  ),
  "### Backend",
  ...(
    lowCoverageBackendFiles.length
      ? lowCoverageBackendFiles.map(
          (f, idx) => `${idx + 1}. ${f.file} -> ${f.lineCoveragePct}% (${f.coveredLines}/${f.totalLines})`
        )
      : ["- N/A"]
  ),
  "",
  "## Casos de prueba fallidos",
  "### Frontend",
  ...(
    frontendFailedTestcases.length
      ? frontendFailedTestcases.map(
          (t, idx) => `${idx + 1}. ${t.classname} :: ${t.name} (${t.durationSeconds}s) - ${t.message}`
        )
      : ["- Sin fallos en frontend"]
  ),
  "### Backend",
  ...(
    backendFailedTestcases.length
      ? backendFailedTestcases.map(
          (t, idx) => `${idx + 1}. ${t.classname} :: ${t.name} (${t.durationSeconds}s) - ${t.message}`
        )
      : ["- Sin fallos en backend"]
  ),
  "",
  "## Fuente de datos",
  "- JUnit: `frontend/junit.xml`, `backend/junit.xml`",
  "- Coverage: `frontend/coverage/coverage-summary.json`, `backend/coverage/coverage-summary.json`",
  "- Coverage per-file: entries del `coverage-summary.json` por archivo",
  "- Objetivos de cobertura: `coverageThreshold.global` de `frontend/jest.config.js` y `backend/jest.config.js` (no un valor fijo)",
  "- Contexto de build: variables de Jenkins (`BUILD_NUMBER`, `JOB_NAME`, `BUILD_URL`, commit y autor)",
  "",
  "## Evidencia historica",
  "- Historico acumulado en `docs/metrics/pre-cicd-baseline.csv`.",
].join("\n");

fs.writeFileSync(mdPath, md, "utf8");

console.log(`[metrics] Reportes generados en: ${metricsDir}`);
console.log(`[metrics] CSV: ${csvPath}`);
console.log(`[metrics] Markdown: ${mdPath}`);
console.log(`[metrics] JSON: ${jsonPath}`);
