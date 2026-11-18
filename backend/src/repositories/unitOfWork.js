/**
 * Unidad de trabajo
 *
 * Ejecuta como una sola operación lo que toca varios repositorios: el registro de
 * una venta reserva el stock, crea la venta con sus líneas y actualiza las
 * estadísticas del cliente; la anulación hace lo inverso.
 *
 * En modo database abre una transacción interactiva de Prisma y entrega a la
 * función repositorios que usan esa transacción: si algo falla, PostgreSQL
 * deshace todo, y una interrupción del proceso a mitad de camino ya no deja
 * stock reservado sin venta. En modo memoria no hay transacción; se mantienen
 * las compensaciones de los repositorios.
 */

const { resolveRepositoryMode } = require("./factory");
const { getPrismaClient } = require("../db/prismaClient");

// maxWait: espera máxima por una conexión libre; timeout: duración máxima de la
// transacción. Los valores por defecto de Prisma (2 s y 5 s) son ajustados para
// una función serverless que comparte una sola conexión por instancia.
const TRANSACTION_OPTIONS = { maxWait: 5000, timeout: 10000 };

/**
 * @param {(repos: {productRepository, customerRepository, saleRepository}) => Promise<any>} work
 * @returns {Promise<any>} lo que devuelva `work`
 */
const runInTransaction = (work) => {
  // Se resuelven aquí para evitar dependencias circulares entre módulos.
  const products = require("./productRepository");
  const customers = require("./customerRepository");
  const sales = require("./saleRepository");

  if (resolveRepositoryMode() === "database") {
    return getPrismaClient().$transaction(
      (tx) =>
        work({
          productRepository: new products.DatabaseProductRepository(tx),
          customerRepository: new customers.DatabaseCustomerRepository(tx),
          saleRepository: new sales.DatabaseSaleRepository(tx),
        }),
      TRANSACTION_OPTIONS
    );
  }

  return work({
    productRepository: products.createProductRepository(),
    customerRepository: customers.createCustomerRepository(),
    saleRepository: sales.createSaleRepository(),
  });
};

module.exports = { runInTransaction, TRANSACTION_OPTIONS };
