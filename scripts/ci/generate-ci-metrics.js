const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const metricsDir = path.join(rootDir, process.env.METRICS_DIR || "docs/metrics");

// Salidas del script. Los nombres `pre-cicd-baseline.*` eran herencia del primer
// diseno y confundian: el historico acumula builds de cualquier perfil y el
// perfil real vive en la columna `profile`, no en el nombre del archivo.
const HISTORY_CSV = "metrics-history.csv";
const LATEST_MD = "latest-build.md";
const LEGACY_NAMES = {
  "metrics-history.csv": "pre-cicd-baseline.csv",
  "latest-build.md": "pre-cicd-baseline.md",
};

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
const commitTimestampEpoch = Number(process.env.GIT_COMMIT_TIMESTAMP || 0);
const timestamp = new Date().toISOString();
const LOW_COVERAGE_LIMIT = 10;

const PROCESS_STEPS_TOTAL = 6;
const PROCESS_MODEL = {
  "pre-cicd": { manualSteps: 6 },
  "post-cicd": { manualSteps: 1 },
};

const processModel = PROCESS_MODEL[profile] || PROCESS_MODEL["pre-cicd"];
const manualSteps = processModel.manualSteps;
const automatedSteps = PROCESS_STEPS_TOTAL - manualSteps;
const automationLevelPct = Number(
  ((automatedSteps / PROCESS_STEPS_TOTAL) * 100).toFixed(2)
);


// Tope de plausibilidad de M2. Si el build lo disparo el polling SCM, el tiempo
// entre el commit y el fin del build no puede superar: intervalo de polling +
// duracion del propio build + un margen (cola de ejecucion). Cuando lo supera,
// el build se lanzo a mano sobre codigo antiguo y la resta mide la antiguedad del
// commit, no la latencia de entrega: se reporta null con el motivo.
//
// El tope anterior era una constante de 6 h, demasiado holgada: dejaba pasar
// builds manuales sobre commits de horas atras (el build 18 publico 19.722 s).
const POLL_INTERVAL_SECONDS = Number(process.env.POLL_INTERVAL_SECONDS || 300);
const M2_MARGIN_SECONDS = Number(process.env.M2_MARGIN_SECONDS || 300);
const M2_ABSOLUTE_MAX_SECONDS = Number(
  process.env.M2_MAX_PLAUSIBLE_SECONDS || 6 * 3600
);

function maxPlausibleCommitToStaging() {
  if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
    return Math.min(
      M2_ABSOLUTE_MAX_SECONDS,
      POLL_INTERVAL_SECONDS + Math.round(durationSeconds) + M2_MARGIN_SECONDS
    );
  }
  // Sin duracion de build (p. ej. ejecucion local del script) se cae al tope absoluto.
  return M2_ABSOLUTE_MAX_SECONDS;
}

function computeCommitToStaging() {
  if (!Number.isFinite(commitTimestampEpoch) || commitTimestampEpoch <= 0) {
    return { seconds: null, note: "Jenkins no exporto GIT_COMMIT_TIMESTAMP" };
  }
  if (String(result).toUpperCase() !== "SUCCESS") {
    return { seconds: null, note: "el build no termino en SUCCESS" };
  }
  const elapsed = Math.round(Date.now() / 1000 - commitTimestampEpoch);
  if (elapsed < 0) {
    return { seconds: null, note: "reloj del agente por detras del commit" };
  }
  const maxPlausible = maxPlausibleCommitToStaging();
  if (elapsed > maxPlausible) {
    const minutes = (elapsed / 60).toFixed(1);
    return {
      seconds: null,
      note:
        "pasaron " + minutes + " min entre el commit y el fin del build, por encima del " +
        "tope de " + (maxPlausible / 60).toFixed(1) + " min (polling + duracion del build + " +
        "margen): el build no fue disparado por ese commit",
    };
  }
  return { seconds: elapsed, note: null };
}

const commitToStaging = computeCommitToStaging();
const commitToStagingSeconds = commitToStaging.seconds;
const commitToStagingNote = commitToStaging.note;

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

// Si el espacio de trabajo viene de una version anterior, se conserva el
// historico renombrando los archivos en vez de empezar de cero.
Object.entries(LEGACY_NAMES).forEach(([current, legacy]) => {
  const currentPath = path.join(metricsDir, current);
  const legacyPath = path.join(metricsDir, legacy);
  if (!fs.existsSync(currentPath) && fs.existsSync(legacyPath)) {
    fs.renameSync(legacyPath, currentPath);
    console.log("[metricas] " + legacy + " renombrado a " + current + " (historico conservado).");
  }
});

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
  commitToStagingSeconds,
  manualSteps,
  automationLevelPct,
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

const csvPath = path.join(metricsDir, HISTORY_CSV);
const historicalRows = parseCsvRows(csvPath);
const previous = historicalRows.length ? historicalRows[historicalRows.length - 1] : null;

const allBuildsIncludingCurrent = [...historicalRows, row];

// Los indicadores DORA describen el proceso que se esta midiendo, asi que se
// calculan solo sobre los builds del MISMO perfil. Sin este filtro, los builds
// del periodo en que se estaba construyendo el pipeline (perfil pre-cicd, donde
// los fallos eran de configuracion y no defectos del producto) contaminaban los
// indicadores del proceso automatizado y producian una tasa de fallo irreal.
const sameProfileBuilds = allBuildsIncludingCurrent.filter(
  (r) => !r.profile || r.profile === profile
);
const changeFailureRatePct = computeChangeFailureRatePct(sameProfileBuilds);
const deploymentFrequency = computeDeploymentFrequency(sameProfileBuilds);
const doraBuildsConsidered = sameProfileBuilds.length;

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
  "commitToStagingSeconds",
  "manualSteps",
  "automationLevelPct",
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

const newHeader = headers.join(",");
const csvLine = headers.map((key) => toCsvValue(row[key])).join(",");
const existingHeader = fs.existsSync(csvPath)
  ? (readTextIfExists(csvPath).split(/\r?\n/)[0] || "").trim()
  : null;

if (existingHeader === newHeader) {
  fs.appendFileSync(csvPath, csvLine + "\n", "utf8");
} else {
  // Cuando cambian las columnas, el historico se MIGRA al encabezado nuevo (las
  // columnas que no existian quedan vacias) en lugar de archivarse y empezar de
  // cero: las tendencias, los indicadores DORA y el comparativo AS-IS/TO-BE
  // necesitan la serie completa. Antes, cada cambio de columnas dejaba un CSV
  // con una sola fila.
  if (existingHeader !== null) {
    fs.copyFileSync(csvPath, csvPath + ".bak");
    console.log(
      "[metricas] columnas nuevas en el historico: " +
        historicalRows.length +
        " fila(s) migradas (copia previa en " +
        path.basename(csvPath) +
        ".bak)."
    );
  }
  const migrated = historicalRows.map((r) => headers.map((key) => toCsvValue(r[key])).join(","));
  fs.writeFileSync(csvPath, [newHeader].concat(migrated, csvLine).join("\n") + "\n", "utf8");
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

const mdPath = path.join(metricsDir, LATEST_MD);
const md = [
  profile === "post-cicd"
    ? "# Metricas del proceso automatizado (TO-BE)"
    : "# Metricas de la linea base manual (AS-IS)",
  "",
  "Este archivo se actualiza automaticamente en Jenkins al finalizar cada build.",
  "Guia de lectura completa en `Documentos/Notas/README.md` del repositorio de la tesis.",
  "",
  `- Ultima actualizacion: ${timestamp}`,
  `- Build: #${buildNumber}`,
  `- Resultado: ${result}`,
  `- Duracion total (s): ${durationSeconds}`,
  `- Tiempo commit -> staging (s): ${commitToStagingSeconds ?? `N/A (${commitToStagingNote})`}`,
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
  "_Nota: Jest corre con `--coverageThreshold='{}'` para que los reportes se generen siempre; el umbral lo verifica despues `scripts/ci/check-coverage.js`, que detiene la etapa de pruebas si alguna metrica queda por debajo._",
  "",
  "## Metricas comparativas AS-IS / TO-BE (M1-M6)",
  `Perfil de esta ejecucion: \`${profile}\` (${profile === "post-cicd" ? "TO-BE, proceso automatizado" : "AS-IS, linea base manual"}).`,
  "",
  `- M1 — Tiempo total de ejecucion del pipeline (s): ${durationSeconds}`,
  `- M2 — Tiempo desde el commit hasta la version en staging (s): ${commitToStagingSeconds ?? `N/A — ${commitToStagingNote}`} _(incluye la latencia del polling SCM; solo se publica en builds exitosos disparados por un commit reciente)_`,
  `- M3 — Pasos manuales por despliegue: ${manualSteps} de ${PROCESS_STEPS_TOTAL} _(propiedad del proceso modelado en el BPMN, no medida por build)_`,
  `- M4 — Errores detectados antes del despliegue: ${failedTests} de ${totalTests} pruebas (${failureRatePct}%)`,
  `- M5 — Nivel de automatizacion (%): ${automationLevelPct} _(${automatedSteps} de ${PROCESS_STEPS_TOTAL} pasos automatizados)_`,
  `- M6 — Frecuencia de despliegues: ${deploymentFrequency.successfulBuilds} builds exitosos en ${deploymentFrequency.daysObserved} dia(s) (~${deploymentFrequency.perWeek}/semana)`,
  "",
  `## Indicadores estilo DORA (historico del perfil \`${profile}\`: ${doraBuildsConsidered} build(s))`,
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
  "- Historico acumulado en `" + path.posix.join(process.env.METRICS_DIR || "docs/metrics", HISTORY_CSV) + "`.",
].join("\n");

fs.writeFileSync(mdPath, md, "utf8");

// Resumen por build en texto plano: mismo contenido que el Markdown del ultimo
// build, pero con un archivo propio por ejecucion, legible sin renderizar y
// facil de adjuntar como evidencia. Sustituye al metrics-<build>.txt que antes
// escribia el Jenkinsfile con un resumen mas pobre.
function toPlainText(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^#+\s*/, "")
        .replace(/\*\*/g, "")
        .replace(/`/g, "")
        .replace(/✅/g, "[OK]")
        .replace(/⚠️/g, "[BAJO]")
        .replace(/⬜/g, "[N/A]")
    )
    .join("\n");
}

const txtPath = path.join(metricsDir, "build-metrics-" + buildNumber + ".txt");
fs.writeFileSync(txtPath, toPlainText(md) + "\n", "utf8");

console.log("[metricas] Reportes generados en: " + metricsDir);
console.log("[metricas] Historico (CSV): " + csvPath);
console.log("[metricas] Resumen del build (TXT): " + txtPath);
console.log("[metricas] Resumen del ultimo build (MD): " + mdPath);
console.log("[metricas] Detalle del build (JSON): " + jsonPath);
