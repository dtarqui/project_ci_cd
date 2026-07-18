/**
 * HTTP Responses
 * Helpers finos para no repetir `res.status(x).json({...})` en cada
 * controller. No infieren ni agregan campos: el caller sigue armando el
 * payload exacto (mismo contrato JSON de siempre), esto solo centraliza el
 * envío de la respuesta.
 */

const sendSuccess = (res, payload = {}, status = 200) => {
  res.status(status).json({ success: true, ...payload });
};

const sendError = (res, status, payload) => {
  res.status(status).json(payload);
};

module.exports = { sendSuccess, sendError };
