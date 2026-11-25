/**
 * Cookie del token de renovacion.
 *
 * - HttpOnly: el JavaScript de la pagina no puede leerla, de modo que un XSS no
 *   puede robar el token de renovacion (el de acceso vive solo en memoria).
 * - Secure: solo viaja por HTTPS (los navegadores tratan localhost como seguro).
 * - SameSite=Strict: el navegador no la envia en peticiones iniciadas desde otro
 *   sitio, lo que impide usarla en un ataque CSRF contra /auth/refresh.
 * - Path=/api/v1/auth: solo acompana a las rutas de autenticacion.
 *
 * En produccion, el frontend llama a la API por su propio dominio, que la
 * reenvia al backend (regla de frontend/vercel.json); asi la cookie es del mismo
 * sitio y los navegadores que bloquean las cookies de terceros no la descartan.
 */

const REFRESH_COOKIE = "rt";
const REFRESH_COOKIE_PATH = "/api/v1/auth";

const cookieAttributes = () =>
  [
    `Path=${REFRESH_COOKIE_PATH}`,
    "HttpOnly",
    process.env.COOKIE_SECURE === "false" ? null : "Secure",
    "SameSite=Strict",
  ].filter(Boolean);

/** Valor de una cookie de la peticion, o null. */
const readCookie = (req, name) => {
  const header = req.headers?.cookie;
  if (!header) {
    return null;
  }
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
};

const setRefreshCookie = (res, token, expiresAt) => {
  const maxAge = Math.max(expiresAt - Math.floor(Date.now() / 1000), 0);
  res.append(
    "Set-Cookie",
    [`${REFRESH_COOKIE}=${encodeURIComponent(token)}`, ...cookieAttributes(), `Max-Age=${maxAge}`].join("; ")
  );
};

const clearRefreshCookie = (res) => {
  res.append("Set-Cookie", [`${REFRESH_COOKIE}=`, ...cookieAttributes(), "Max-Age=0"].join("; "));
};

const readRefreshCookie = (req) => readCookie(req, REFRESH_COOKIE);

module.exports = {
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  readCookie,
  readRefreshCookie,
  setRefreshCookie,
  clearRefreshCookie,
};
