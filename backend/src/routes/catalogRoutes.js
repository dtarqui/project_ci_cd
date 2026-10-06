/**
 * Catalog Routes - Catalogos administrables (ciudades y categorias).
 *
 * Lectura: cualquier usuario autenticado, porque los formularios de cliente y de
 * producto necesitan la lista.
 * Escritura: solo admin, igual que la baja de clientes y productos.
 */

const express = require("express");
const router = express.Router();
const { listar, crear, actualizar, eliminar } = require("../controllers/catalogController");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const soloAdmin = [authenticateToken, requireRole("admin")];

/** Monta el mismo CRUD para cada catalogo, bajo su propio prefijo. */
const montarCatalogo = (recurso) => {
  /**
   * @route GET /api/catalogs/<recurso>
   * @description Lista las entradas vigentes del catalogo
   * @access Protected
   */
  router.get(`/${recurso}`, authenticateToken, asyncHandler(listar(recurso)));

  /**
   * @route POST /api/catalogs/<recurso>
   * @description Crea una entrada
   * @access Protected (solo admin)
   */
  router.post(`/${recurso}`, ...soloAdmin, asyncHandler(crear(recurso)));

  /**
   * @route PUT /api/catalogs/<recurso>/:id
   * @description Actualiza una entrada
   * @access Protected (solo admin)
   */
  router.put(`/${recurso}/:id`, ...soloAdmin, asyncHandler(actualizar(recurso)));

  /**
   * @route DELETE /api/catalogs/<recurso>/:id
   * @description Da de baja una entrada. La baja es logica.
   * @access Protected (solo admin)
   */
  router.delete(`/${recurso}/:id`, ...soloAdmin, asyncHandler(eliminar(recurso)));
};

montarCatalogo("cities");
montarCatalogo("categories");

module.exports = router;
