/**
 * Verificacion posterior al despliegue (etapa "Post-Deploy Smoke Test" del Jenkinsfile).
 *
 * Consulta la version recien publicada y termina con codigo 1 si no responde como se espera,
 * de modo que el pipeline no da por bueno un despliegue que no funciona. Existe porque la
 * etapa Backend Validation solo prueba que el servidor arranca en el agente, antes de
 * desplegar y sin base de datos: en las ejecuciones 18 a 23 el pipeline termino en verde con
 * la aplicacion de staging rota (el codigo pedia columnas que la migracion no habia creado).
 *
 * Las comprobaciones se declaran en el bloque environment del Jenkinsfile, no aqui:
 *
 *   SMOKE_BACKEND_CHECKS, SMOKE_FRONTEND_CHECKS
 *       Lista separada por ";" de entradas RUTA o RUTA=>TEXTO. Cada RUTA debe responder 2xx
 *       y, si se indica TEXTO, contenerlo en el cuerpo de la respuesta. Vacia = no se verifica.
 *   SMOKE_BACKEND_BASE_URL, SMOKE_FRONTEND_BASE_URL
 *       URL base a consultar. Por defecto, las que exportaron las etapas de despliegue
 *       (BACKEND_VERCEL_URL y VERCEL_URL).
 *   SMOKE_ATTEMPTS (3), SMOKE_RETRY_DELAY_SECONDS (10), SMOKE_TIMEOUT_SECONDS (20)
 *       Reintentos por comprobacion, espera entre intentos y tiempo maximo por peticion. Los
 *       reintentos absorben el arranque en frio de las funciones serverless.
 *
 * Uso local: SMOKE_BACKEND_BASE_URL=http://localhost:4000 SMOKE_BACKEND_CHECKS="/health"
 *            node scripts/ci/smoke-test.js
 */

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

const ATTEMPTS = positiveInteger(process.env.SMOKE_ATTEMPTS, 3);
const RETRY_DELAY_MS = positiveInteger(process.env.SMOKE_RETRY_DELAY_SECONDS, 10) * 1000;
const TIMEOUT_MS = positiveInteger(process.env.SMOKE_TIMEOUT_SECONDS, 20) * 1000;
const BODY_EXCERPT_LENGTH = 200;

/** "RUTA=>TEXTO;RUTA" -> [{ path, expected }] */
function parseChecks(spec) {
  return String(spec || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf("=>");
      const rawPath = (separator === -1 ? entry : entry.slice(0, separator)).trim();
      const expected = separator === -1 ? "" : entry.slice(separator + 2).trim();
      return { path: rawPath.startsWith("/") ? rawPath : `/${rawPath}`, expected };
    });
}

/** Acepta "dominio.vercel.app" o "https://dominio.vercel.app/" y devuelve la forma con esquema y sin "/" final. */
function normalizeBaseUrl(url) {
  const trimmed = String(url || "").trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "ci-smoke-test" },
    });
    return { status: response.status, body: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}

/** Motivo del fallo, o null si la respuesta cumple la comprobacion. */
function evaluateResponse(response, expected) {
  if (response.status < 200 || response.status >= 300) {
    const protectionHint =
      response.status === 401 || response.status === 403
        ? " (en Vercel suele ser la proteccion de despliegues: usa el dominio de produccion en SMOKE_*_BASE_URL o desactivala)"
        : "";
    return `HTTP ${response.status}${protectionHint}`;
  }
  if (expected && !response.body.includes(expected)) {
    return `la respuesta no contiene ${JSON.stringify(expected)}`;
  }
  return null;
}

async function runCheck(target, baseUrl, check) {
  const url = baseUrl + check.path;
  let failure = null;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url);
      failure = evaluateResponse(response, check.expected);
      if (!failure) {
        console.log(`[smoke] OK    ${target} ${url} (HTTP ${response.status}, intento ${attempt})`);
        return true;
      }
      const excerpt = response.body.slice(0, BODY_EXCERPT_LENGTH).replace(/\s+/g, " ");
      failure += ` - inicio de la respuesta: ${excerpt}`;
    } catch (error) {
      failure =
        error.name === "AbortError"
          ? `sin respuesta en ${TIMEOUT_MS / 1000} s`
          : `error de red: ${error.message}`;
    }

    if (attempt < ATTEMPTS) {
      console.log(`[smoke] ...   ${target} ${url}: ${failure}. Reintento en ${RETRY_DELAY_MS / 1000} s`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  console.error(`[smoke] FALLO ${target} ${url}: ${failure}`);
  return false;
}

async function main(env = process.env) {
  const targets = [
    {
      name: "backend",
      baseUrl: normalizeBaseUrl(env.SMOKE_BACKEND_BASE_URL || env.BACKEND_VERCEL_URL),
      checks: parseChecks(env.SMOKE_BACKEND_CHECKS),
    },
    {
      name: "frontend",
      baseUrl: normalizeBaseUrl(env.SMOKE_FRONTEND_BASE_URL || env.VERCEL_URL),
      checks: parseChecks(env.SMOKE_FRONTEND_CHECKS),
    },
  ].filter((target) => target.checks.length);

  if (!targets.length) {
    console.log("[smoke] No hay comprobaciones configuradas: nada que verificar.");
    return 0;
  }

  const total = targets.reduce((acc, target) => acc + target.checks.length, 0);
  let failed = 0;

  for (const target of targets) {
    if (!target.baseUrl) {
      console.error(
        `[smoke] FALLO ${target.name}: no hay URL que verificar; la etapa de despliegue no exporto la direccion publicada`
      );
      failed += target.checks.length;
      continue;
    }
    for (const check of target.checks) {
      if (!(await runCheck(target.name, target.baseUrl, check))) {
        failed += 1;
      }
    }
  }

  if (failed) {
    console.error(
      `[smoke] ${failed} de ${total} comprobacion(es) fallaron: la version publicada no se considera verificada.`
    );
    return 1;
  }
  console.log(`[smoke] ${total} comprobacion(es) superadas: la version publicada responde como se esperaba.`);
  return 0;
}

if (require.main === module) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error("[smoke] Error inesperado:", error);
      process.exitCode = 1;
    }
  );
}

module.exports = { parseChecks, normalizeBaseUrl, evaluateResponse, main };
