/**
 * Catalog Controller - CRUD de los catalogos administrables.
 *
 * Un solo controlador para ciudades y categorias: tienen la misma forma y el
 * mismo CRUD, de modo que duplicarlo solo serviria para que las dos copias
 * acabaran divergiendo.
 *
 * La lectura la necesitan los formularios de cliente y de producto, asi que basta
 * con estar autenticado. La escritura la restringe el rol admin desde las rutas.
 */

const { createCatalogRepository, CATALOGOS } = require("../repositories/catalogRepository");
const { sendSuccess, sendError } = require("../utils/httpResponses");
const { validateCatalogEntry } = require("../utils/validators");

const repositorios = {
  cities: createCatalogRepository("cities"),
  categories: createCatalogRepository("categories"),
};

const repositorioDe = (recurso) => repositorios[recurso];

const noEncontrado = (recurso, res) =>
  sendError(res, 404, {
    error: `${CATALOGOS[recurso].etiqueta} no existe`,
    code: "CATALOG_ENTRY_NOT_FOUND",
  });

/** Rechaza un nombre que ya usa otra entrada viva del mismo catalogo. */
const nombreRepetido = async (recurso, name, excluirId = null) => {
  const existente = await repositorioDe(recurso).findByName(name, excluirId);
  return Boolean(existente);
};

const listar = (recurso) => async (req, res) => {
  const filas = await repositorioDe(recurso).list();

  sendSuccess(res, { data: filas, count: filas.length });
};

const crear = (recurso) => async (req, res) => {
  const validation = validateCatalogEntry(recurso, req.body);

  if (!validation.isValid) {
    return sendError(res, 400, { error: validation.error, code: validation.code });
  }

  if (await nombreRepetido(recurso, req.body.name)) {
    return sendError(res, 409, {
      error: `${CATALOGOS[recurso].etiqueta} ya existe`,
      code: "CATALOG_ENTRY_DUPLICATED",
    });
  }

  const creada = await repositorioDe(recurso).create(req.body);

  sendSuccess(
    res,
    {
      data: creada,
      message: `${CATALOGOS[recurso].etiqueta} se creó correctamente`,
      timestamp: new Date().toISOString(),
    },
    201
  );
};

const actualizar = (recurso) => async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const validation = validateCatalogEntry(recurso, req.body, { parcial: true });

  if (!validation.isValid) {
    return sendError(res, 400, { error: validation.error, code: validation.code });
  }

  if (req.body.name !== undefined && (await nombreRepetido(recurso, req.body.name, id))) {
    return sendError(res, 409, {
      error: `${CATALOGOS[recurso].etiqueta} ya existe`,
      code: "CATALOG_ENTRY_DUPLICATED",
    });
  }

  const actualizada = await repositorioDe(recurso).update(id, req.body);

  if (!actualizada) {
    return noEncontrado(recurso, res);
  }

  sendSuccess(res, {
    data: actualizada,
    message: `${CATALOGOS[recurso].etiqueta} se actualizó correctamente`,
    timestamp: new Date().toISOString(),
  });
};

const eliminar = (recurso) => async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const eliminada = await repositorioDe(recurso).delete(id);

  if (!eliminada) {
    return noEncontrado(recurso, res);
  }

  sendSuccess(res, {
    data: eliminada,
    message: `${CATALOGOS[recurso].etiqueta} se dio de baja correctamente`,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  listar,
  crear,
  actualizar,
  eliminar,
  repositorioDe,
};
