/**
 * Alertas de seguridad (OWASP A09:2025).
 *
 * Una alerta se emite por tres caminos a la vez:
 *   1. el registro estructurado, con el evento "security.alert" y nivel error;
 *   2. la tabla security_alerts (o la memoria, en modo memoria), que el
 *      administrador consulta en GET /api/v1/security/alerts;
 *   3. un webhook, si SECURITY_ALERT_WEBHOOK_URL esta configurada: se envia un
 *      JSON con un campo "text" legible, compatible con los webhooks entrantes de
 *      Slack, Teams o Discord, y la alerta completa.
 *
 * Cada camino es independiente: si la base o el webhook fallan, la alerta queda
 * igual en el registro y la peticion que la provoco responde con normalidad.
 *
 * Reglas (las aplican los controladores y el middleware):
 *   - refresh_token_reuse (critica): se presento un token de renovacion ya rotado;
 *     senal de robo, se cierran todas las sesiones del usuario.
 *   - account_locked (alta): una cuenta llego al maximo de intentos fallidos.
 *   - access_denied_burst (media): un usuario acumulo ACCESS_DENIED_ALERT_THRESHOLD
 *     respuestas 403 en ACCESS_DENIED_WINDOW_MINUTES (posible sondeo de privilegios).
 *
 * Limitacion: el contador de accesos denegados vive en la memoria de cada
 * instancia, como el limite de intentos de inicio de sesion.
 */

const { logEvent } = require("../utils/logger");
const { createSecurityAlertRepository } = require("../repositories/securityAlertRepository");

const WEBHOOK_TIMEOUT_MS = 3000;
const SEVERITY_LABEL = { critical: "CRÍTICA", high: "ALTA", medium: "MEDIA" };

const summarizeAlert = ({ type, severity, username, userId, ip }) => {
  const who = username || (userId ? `usuario ${userId}` : "usuario desconocido");
  return `[${SEVERITY_LABEL[severity] || severity}] ${type}: ${who}${ip ? ` desde ${ip}` : ""}`;
};

const sendWebhook = async (url, alert) => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: summarizeAlert(alert), alert }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!response.ok) {
      logEvent("warn", "security.alert_webhook_failed", { type: alert.type, status: response.status });
      return false;
    }
    return true;
  } catch (error) {
    logEvent("warn", "security.alert_webhook_failed", { type: alert.type, errorName: error?.name });
    return false;
  }
};

/**
 * Emite una alerta. No lanza excepciones.
 * @param {{type: string, severity: string, userId?: number, username?: string, ip?: string, details?: Object}} alert
 * @returns {Promise<{logged: boolean, stored: boolean, notified: boolean}>}
 */
const raiseAlert = async (alert) => {
  const logged = logEvent("error", "security.alert", alert);

  let stored = false;
  try {
    await createSecurityAlertRepository().create(alert);
    stored = true;
  } catch (error) {
    logEvent("warn", "security.alert_store_failed", { type: alert.type, errorCode: error?.code ?? null });
  }

  const url = process.env.SECURITY_ALERT_WEBHOOK_URL;
  const notified = url ? await sendWebhook(url, alert) : false;

  return { logged, stored, notified };
};

const listAlerts = (limit) => createSecurityAlertRepository().listRecent(limit);

/**
 * Cuenta las respuestas 403 de cada usuario en una ventana fija y avisa una vez al
 * alcanzar el umbral dentro de esa ventana.
 */
const createAccessDeniedMonitor = ({
  threshold = parseInt(process.env.ACCESS_DENIED_ALERT_THRESHOLD, 10) || 5,
  windowMs = (parseInt(process.env.ACCESS_DENIED_WINDOW_MINUTES, 10) || 5) * 60 * 1000,
  now = () => Date.now(),
} = {}) => {
  const counters = new Map();

  return {
    /** @returns {boolean} true si este rechazo alcanza el umbral */
    record(userId) {
      const current = counters.get(userId);
      const entry =
        current && now() - current.firstAt < windowMs
          ? { ...current, count: current.count + 1 }
          : { count: 1, firstAt: now() };
      counters.set(userId, entry);
      return entry.count === threshold;
    },
    threshold,
    windowMs,
  };
};

module.exports = {
  raiseAlert,
  listAlerts,
  createAccessDeniedMonitor,
  summarizeAlert,
  WEBHOOK_TIMEOUT_MS,
};
