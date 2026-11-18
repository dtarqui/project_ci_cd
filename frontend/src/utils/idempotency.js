/**
 * Clave de idempotencia para el registro de una venta.
 *
 * Se genera una por cada venta que el usuario intenta registrar y se reutiliza en
 * sus reintentos: si la red se corta despues de que el servidor registro la
 * venta, el reintento recibe esa misma venta en lugar de duplicarla y descontar
 * el stock dos veces.
 */
export const newIdempotencyKey = (cryptoImpl = globalThis.crypto) => {
  if (typeof cryptoImpl?.randomUUID === "function") {
    return cryptoImpl.randomUUID();
  }

  // Navegadores sin randomUUID: marca de tiempo y azar, solo con caracteres que
  // acepta el servidor (letras, digitos y guiones).
  const random = Math.random().toString(36).slice(2, 12).padEnd(10, "0");
  return `${Date.now().toString(36)}-${random}`;
};
