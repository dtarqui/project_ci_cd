#!/usr/bin/env node
/**
 * Verifica la cobertura real de un componente contra los umbrales declarados en
 * su jest.config.js y falla (exit 1) si alguna metrica queda por debajo.
 *
 * Por que existe: el pipeline ejecuta Jest con `--coverageThreshold='{}'` para
 * que los reportes (HTML, LCOV, Cobertura, JSON) se generen incluso cuando la
 * cobertura no alcanza el objetivo. Sin esta verificacion posterior, el umbral
 * quedaria solo como un dato informativo y el pipeline desplegaria codigo por
 * debajo del minimo que declara el perfil de especialidad.
 *
 * Uso: node scripts/ci/check-coverage.js <frontend|backend|ruta>
 */
const fs = require("fs");
const path = require("path");

const METRICS = ["lines", "statements", "branches", "functions"];

const target = process.argv[2];
if (!target) {
  console.error("Uso: node scripts/ci/check-coverage.js <frontend|backend|ruta>");
  process.exit(2);
}

const rootDir = path.resolve(__dirname, "..", "..");
const projectDir = path.isAbsolute(target) ? target : path.join(rootDir, target);
const label = path.basename(projectDir);

function readThresholds(dir) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const config = require(path.join(dir, "jest.config.js"));
    const global = (config && config.coverageThreshold && config.coverageThreshold.global) || {};
    return METRICS.reduce((acc, key) => {
      acc[key] = typeof global[key] === "number" ? global[key] : null;
      return acc;
    }, {});
  } catch (err) {
    console.error(`[cobertura:${label}] no se pudo leer jest.config.js: ${err.message}`);
    return null;
  }
}

function readCoverage(dir) {
  const summaryPath = path.join(dir, "coverage", "coverage-summary.json");
  if (!fs.existsSync(summaryPath)) {
    console.error(
      `[cobertura:${label}] no existe ${path.relative(rootDir, summaryPath)}. ` +
        "La etapa de pruebas debe ejecutarse con --coverageReporters=json-summary."
    );
    return null;
  }
  try {
    const total = JSON.parse(fs.readFileSync(summaryPath, "utf8")).total || {};
    return METRICS.reduce((acc, key) => {
      const pct = total[key] && typeof total[key].pct === "number" ? total[key].pct : null;
      acc[key] = pct;
      return acc;
    }, {});
  } catch (err) {
    console.error(`[cobertura:${label}] ${summaryPath} no se pudo leer: ${err.message}`);
    return null;
  }
}

const thresholds = readThresholds(projectDir);
const coverage = readCoverage(projectDir);
if (!thresholds || !coverage) {
  process.exit(1);
}

const comparable = METRICS.filter((key) => thresholds[key] !== null && coverage[key] !== null);
if (!comparable.length) {
  console.log(`[cobertura:${label}] sin umbrales declarados en jest.config.js; no hay nada que verificar.`);
  process.exit(0);
}

const failed = [];
console.log(`[cobertura:${label}] metrica: real / umbral`);
comparable.forEach((key) => {
  const real = coverage[key];
  const min = thresholds[key];
  const ok = real >= min;
  if (!ok) {
    failed.push(`${key} ${real}% < ${min}%`);
  }
  console.log(`  ${ok ? "OK  " : "BAJO"} ${key}: ${real}% / ${min}%`);
});

if (failed.length) {
  console.error(
    `[cobertura:${label}] la cobertura no alcanza el minimo declarado: ${failed.join(", ")}.`
  );
  process.exit(1);
}

console.log(`[cobertura:${label}] cobertura por encima de todos los umbrales.`);
