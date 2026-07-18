/**
 * Sale Repository
 * Capa de acceso a datos de ventas (memory/database).
 */

const { SaleDao } = require("../dao/saleDao");
const { getMockData } = require("../db/dataStore");
const { getPrismaClient } = require("../db/prismaClient");

// Aplana la relación SaleItem[] de Prisma a la misma forma que usa el
// frontend/InMemorySaleRepository: { productId, name, quantity, price, total }.
const mapSaleFromDb = (sale) => {
  if (!sale) {
    return null;
  }

  const { items, ...rest } = sale;

  return {
    ...rest,
    items: (items || []).map(({ productId, name, quantity, price, total }) => ({
      productId,
      name,
      quantity,
      price,
      total,
    })),
  };
};

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
    const sales = await getPrismaClient().sale.findMany({
      include: { items: true },
      orderBy: { id: "asc" },
    });

    return sales.map(mapSaleFromDb);
  }

  async findById(id) {
    const sale = await getPrismaClient().sale.findUnique({
      where: { id },
      include: { items: true },
    });

    return mapSaleFromDb(sale);
  }

  async create(payload) {
    const sale = await getPrismaClient().sale.create({
      data: {
        customerId: payload.customerId,
        customerName: payload.customerName,
        subtotal: payload.subtotal,
        tax: payload.tax,
        discount: payload.discount,
        total: payload.total,
        status: payload.status,
        paymentMethod: payload.paymentMethod,
        notes: payload.notes || "",
        items: {
          create: payload.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          })),
        },
      },
      include: { items: true },
    });

    return mapSaleFromDb(sale);
  }

  async update(id, updates) {
    const data = {};

    if (updates.status) data.status = updates.status;
    if (updates.paymentMethod) data.paymentMethod = updates.paymentMethod;
    if (updates.notes !== undefined) data.notes = updates.notes;

    try {
      const sale = await getPrismaClient().sale.update({
        where: { id },
        data,
        include: { items: true },
      });

      return mapSaleFromDb(sale);
    } catch (_error) {
      return null;
    }
  }
}

const createSaleRepository = () => {
  const provider = process.env.REPOSITORY_MODE || "memory";

  if (provider === "database") {
    return new DatabaseSaleRepository();
  }

  return new InMemorySaleRepository();
};

module.exports = {
  InMemorySaleRepository,
  DatabaseSaleRepository,
  createSaleRepository,
  mapSaleFromDb,
};
