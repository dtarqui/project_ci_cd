/**
 * Formato del historico de metricas (`metrics-history.csv`) y los indicadores que
 * se derivan de el.
 *
 * Por que existe: `generate-ci-metrics.js` escribe ese CSV y `generate-research-reports.js`
 * lo lee, y cada uno traia su propia copia del parser y de los indicadores DORA. Las copias
 * se habian separado en dos puntos que importan:
 *
 *   1. El parser. El script de metricas partia cada linea con `split(",")`, ignorando las
 *      comillas que el propio escritor pone cuando un campo contiene una coma (`author`,
 *      `jobName`). Al cambiar las columnas, el historico se migra reescribiendo las filas
 *      antiguas: con el parser ingenuo esas filas salian descuadradas y se corrompia el
 *      archivo que sostiene los anexos D, E y F del perfil.
 *   2. La tasa de fallo por cambio. Un script dividia entre los builds con resultado
 *      conocido (la definicion documentada en `Documentos/Notas/README.md`) y el otro entre
 *      todas las filas, asi que el reporte por build y el comparativo podian publicar dos
 *      cifras distintas del mismo indicador.
 *
 * Todo lo que toca el formato del CSV o define un indicador sobre sus filas vive aqui, en un
 * solo lugar, para que no puedan volver a separarse.
 */
const fs = require("fs");

const MS_PER_DAY = 86400000;

/**
 * Parte una linea de CSV respetando las comillas dobles (y `""` como comilla escapada),
 * que es como `toCsvValue` escribe los campos con comas.
 */
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = i + 1 < line.length ? line[i + 1] : "";

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

/** Contrapartida de `parseCsvLine`: entrecomilla el valor si contiene coma, comilla o salto. */
function toCsvValue(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return '"' + raw.replace(/"/g, '""') + '"';
  }
  return raw;
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

/** Primera linea del CSV, para comparar el encabezado actual con el nuevo. */
function readCsvHeader(csvPath) {
  if (!fs.existsSync(csvPath)) {
    return null;
  }
  return (readTextIfExists(csvPath).split(/\r?\n/)[0] || "").trim();
}

/** Filas del CSV como objetos indexados por el encabezado. */
function parseCsvRows(csvPath) {
  const raw = readTextIfExists(csvPath).trim();
  if (!raw) {
    return [];
  }

  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = (cols[idx] || "").trim();
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

/**
 * Change Failure Rate (DORA): porcentaje de builds fallidos sobre el total de builds
 * **con resultado conocido**. Las filas sin `result` (columnas migradas, ejecuciones
 * interrumpidas) no cuentan ni como exito ni como fallo: incluirlas en el denominador
 * rebajaria el indicador artificialmente.
 */
function changeFailureRatePct(rows) {
  const withResult = rows.filter((r) => r.result);
  if (!withResult.length) {
    return null;
  }
  const failed = withResult.filter((r) => /fail/i.test(r.result)).length;
  return Number(((failed / withResult.length) * 100).toFixed(2));
}

/**
 * Deployment Frequency (DORA): cuantos builds exitosos hubo y a que ritmo semanal,
 * sobre la ventana que cubren los `timestamp` de las filas recibidas.
 */
function deploymentFrequency(rows) {
  const successfulBuilds = rows.filter((r) => r.result && /success/i.test(r.result)).length;
  const timestamps = rows
    .map((r) => new Date(r.timestamp).getTime())
    .filter((t) => Number.isFinite(t));
  const daysObserved =
    timestamps.length >= 2
      ? Math.max(1, Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / MS_PER_DAY))
      : 1;
  return {
    successfulBuilds,
    daysObserved,
    perWeek: successfulBuilds > 0 ? Number(((successfulBuilds / daysObserved) * 7).toFixed(2)) : 0,
  };
}

module.exports = {
  parseCsvLine,
  parseCsvRows,
  readCsvHeader,
  toCsvValue,
  toNumberOrNull,
  average,
  changeFailureRatePct,
  deploymentFrequency,
};
