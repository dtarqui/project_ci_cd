/**
 * Async Handler
 * Envuelve un route handler async para reenviar cualquier rechazo/throw a
 * next(err), donde lo recibe errorHandler (src/middleware/auth.js). Sin
 * esto, un error no capturado en un handler async tumba el proceso completo
 * (Express 4 no captura rechazos de promesas automáticamente).
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
