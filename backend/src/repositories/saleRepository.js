/**
 * Sale Repository
 * Capa de acceso a datos de ventas (memory/database).
 */

const { SaleDao } = require("../mappers/saleDao");
const { getMockData } = require("../db/dataStore");
const { getPrismaClient, isRecordNotFoundError } = require("../db/prismaClient");
const { createRepository } = require("./factory");

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
      userId: payload.userId,
      userName: payload.userName,
      items: payload.items,
      subtotal: payload.subtotal,
      discount: payload.discount,
      total: payload.total,
      status: payload.status,
      paymentMethod: payload.paymentMethod,
      notes: payload.notes,
    });

    sales.push(sale);
    return sale;
  }

  /**
   * Anula la venta solo si estaba activa.
   *
   * La condicion va junto con la escritura para que dos anulaciones simultaneas
   * no devuelvan el stock dos veces.
   * @returns la venta anulada, o null si no existe o ya estaba anulada.
   */
  /**
   * Cuenta las lineas de venta que referencian al producto.
   *
   * Incluye las ventas anuladas: la linea sigue existiendo y sigue nombrando al
   * producto, de modo que para la integridad referencial cuenta igual. El
   * contador `sales` del producto no sirve para esto, porque al anular una venta
   * se decrementa y volveria a cero un producto que si tiene historial.
   */
  /**
   * Cuenta las ventas registradas a nombre del cliente.
   *
   * Incluye las anuladas: la venta sigue existiendo y sigue apuntando al cliente,
   * de modo que para la integridad referencial cuenta igual.
   */
  async countByCustomer(customerId) {
    return getMockData().sales.filter((sale) => sale.customerId === customerId).length;
  }

  async countItemsByProduct(productId) {
    return getMockData().sales.reduce(
      (total, sale) =>
        total + (sale.items || []).filter((item) => item.productId === productId).length,
      0
    );
  }

  async cancel(id) {
    const sales = getMockData().sales;
    const saleIndex = sales.findIndex(
      (sale) => sale.id === id && sale.status?.toLowerCase() !== "anulada"
    );

    if (saleIndex === -1) {
      return null;
    }

    const nextSale = SaleDao.mergeUpdates(sales[saleIndex], { status: "Anulada" });
    sales[saleIndex] = nextSale;

    return nextSale;
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
        userId: payload.userId ?? null,
        userName: payload.userName ?? null,
        subtotal: payload.subtotal,
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

  /**
   * Anula la venta solo si estaba activa.
   *
   * El filtro por estado viaja dentro del UPDATE: si dos anulaciones llegan a la
   * vez, solo una obtiene count 1 y solo una devuelve el stock.
   * @returns la venta anulada, o null si no existe o ya estaba anulada.
   */
  /**
   * Cuenta las lineas de venta que referencian al producto.
   *
   * Incluye las ventas anuladas, por el mismo motivo que la version en memoria:
   * la fila de `sale_items` existe y referencia al producto.
   */
  /**
   * Cuenta las ventas registradas a nombre del cliente.
   *
   * Incluye las anuladas, por el mismo motivo que la version en memoria: la fila
   * de `sales` existe y referencia al cliente.
   */
  async countByCustomer(customerId) {
    return getPrismaClient().sale.count({ where: { customerId } });
  }

  async countItemsByProduct(productId) {
    return getPrismaClient().saleItem.count({ where: { productId } });
  }

  async cancel(id) {
    const { count } = await getPrismaClient().sale.updateMany({
      where: { id, status: { not: "Anulada" } },
      data: { status: "Anulada" },
    });

    if (count === 0) {
      return null;
    }

    return this.findById(id);
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
    } catch (error) {
      if (isRecordNotFoundError(error)) return null;
      throw error;
    }
  }
}

const createSaleRepository = () =>
  createRepository(InMemorySaleRepository, DatabaseSaleRepository);

module.exports = {
  InMemorySaleRepository,
  DatabaseSaleRepository,
  createSaleRepository,
  mapSaleFromDb,
};
