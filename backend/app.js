/**
 * Backend API - Punto de entrada
 * 
 * Estructura refactorizada:
 * src/
 *   ├── config/          - Configuración (CORS, etc)
 *   ├── db/              - Mock data y base de datos
 *   ├── middleware/      - Middleware (autenticación, errores)
 *   ├── controllers/     - Lógica de negocio (auth, products, dashboard)
 *   ├── routes/          - Definición de rutas
 *   ├── utils/           - Funciones reutilizables
 *   └── index.js         - Factory de la app Express
 */

const createApp = require("./src/index");
const { mockData, users } = require("./src/db/mockData");

// Exportar para testing
module.exports = {
  createApp,
  mockData,
  users,
};
