/**
 * Re-export shim para tests
 * Este archivo NO construye la app: solo re-exporta la factory real
 * (`createApp`, definida en `src/index.js`) junto con `mockData`/`users`
 * (`src/db/mockData.js`), para que los tests puedan hacer
 * `require("../app")` desde un único punto estable en la raíz del proyecto.
 * La lógica de construcción de la app (rutas, middleware, CORS) vive en
 * `src/index.js`.
 */

const createApp = require("./src/index");
const { mockData, users } = require("./src/db/mockData");

// Exportar para testing
module.exports = {
  createApp,
  mockData,
  users,
};
