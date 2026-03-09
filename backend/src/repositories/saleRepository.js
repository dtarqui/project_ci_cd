/**
 * Sale Repository
 * Capa de acceso a datos de ventas (memory/database).
 */

const { SaleDao } = require("../dao/saleDao");
const { getMockData } = require("../db/dataStore");

class InMemorySaleRepository {
  async list() {
    return [...getMockData().sales];
  }

  async findById(id) {
    return getMockData().sales.find((sale) => sale.id === id) || null;
  }

  async create(payload) {
    const sales = getMockData().sales;
    const nextId = sales.length > 0 ? Math.max(...sales.map((sale) => sale.id)) + 1 : 1;

    const sale = SaleDao.createFromPayload({
      id: nextId,
      customerId: payload.customerId,
      customerName: payload.customerName,
      items: payload.items,
      subtotal: payload.subtotal,
      tax: payload.tax,
      discount: payload.discount,
      total: payload.total,
      status: payload.status,
      paymentMethod: payload.paymentMethod,
      notes: payload.notes,
    });

    sales.push(sale);
    return sale;
  }

  async update(id, updates) {
    const sales = getMockData().sales;
    const saleIndex = sales.findIndex((sale) => sale.id === id);

    if (saleIndex === -1) {
      return null;
    }

    const nextSale = SaleDao.mergeUpdates(sales[saleIndex], updates);
    sales[saleIndex] = nextSale;

    return nextSale;
  }
}

class DatabaseSaleRepository {
  async list() {
    throw new Error("DatabaseSaleRepository not implemented yet");
  }

  async findById(_id) {
    throw new Error("DatabaseSaleRepository not implemented yet");
  }

  async create(_payload) {
    throw new Error("DatabaseSaleRepository not implemented yet");
  }

  async update(_id, _updates) {
    throw new Error("DatabaseSaleRepository not implemented yet");
  }
}

const createSaleRepository = () => {
  const provider = process.env.DATA_REPOSITORY || "memory";

  if (provider === "database") {
    return new DatabaseSaleRepository();
  }

  return new InMemorySaleRepository();
};

module.exports = {
  InMemorySaleRepository,
  DatabaseSaleRepository,
  createSaleRepository,
};
