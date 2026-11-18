/**
 * Control de concurrencia optimista con ETag e If-Match (RFC 9110, 8.8.3 y 13.1.1).
 *
 * La version de un registro es el instante de su ultima modificacion (updatedAt)
 * en milisegundos. El cliente envia en If-Match la version que leyo; si otro
 * usuario guardo antes, la actualizacion no se aplica y la API responde 412 en vez
 * de pisar sus cambios. Sin If-Match no hay precondicion, como antes.
 */

class PreconditionFailedError extends Error {
  constructor(current) {
    super("El registro cambio desde que se leyo");
    this.name = "PreconditionFailedError";
    this.code = "PRECONDITION_FAILED";
    this.current = current;
  }
}

const versionOf = (entity) => {
  const time = entity?.updatedAt ? new Date(entity.updatedAt).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

const etagOf = (entity) => `"${versionOf(entity)}"`;

/**
 * Interpreta If-Match.
 * @returns {null|"*"|number[]} null sin cabecera; "*" para cualquier version; o
 *   las versiones aceptadas. Las etiquetas debiles (W/) nunca coinciden.
 */
const parseIfMatch = (header) => {
  if (header === undefined || header === null || String(header).trim() === "") {
    return null;
  }

  const value = String(header).trim();
  if (value === "*") {
    return "*";
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => !tag.startsWith("W/"))
    .map((tag) => Number(tag.replace(/^"(.*)"$/, "$1")))
    .filter((version) => Number.isFinite(version));
};

/**
 * Version que debe tener el registro para aplicar la actualizacion, o undefined
 * si la peticion no impone ninguna.
 * @returns {{ ok: boolean, expectedVersion?: number }}
 */
const resolvePrecondition = (entity, header) => {
  const accepted = parseIfMatch(header);

  if (accepted === null || accepted === "*") {
    return { ok: true };
  }

  const current = versionOf(entity);
  return accepted.includes(current) ? { ok: true, expectedVersion: current } : { ok: false };
};

/** En memoria: falla si el registro ya no tiene la version esperada. */
const assertVersion = (entity, expectedVersion) => {
  if (expectedVersion !== undefined && versionOf(entity) !== expectedVersion) {
    throw new PreconditionFailedError(entity);
  }
};

/**
 * En la base: actualiza solo si updatedAt sigue siendo el esperado, en una sola
 * sentencia (UPDATE ... WHERE id = ? AND updated_at = ?). Entre la lectura y la
 * escritura otro usuario no puede colarse.
 */
const updateIfUnchanged = async (delegate, id, data, expectedVersion) => {
  const { count } = await delegate.updateMany({
    where: { id, updatedAt: new Date(expectedVersion) },
    data,
  });

  if (count === 0) {
    const current = await delegate.findUnique({ where: { id } });
    if (!current) {
      return null;
    }
    throw new PreconditionFailedError(current);
  }

  return delegate.findUnique({ where: { id } });
};

module.exports = {
  PreconditionFailedError,
  versionOf,
  etagOf,
  parseIfMatch,
  resolvePrecondition,
  assertVersion,
  updateIfUnchanged,
};
