/**
 * Product Repository
 * Capa de acceso a datos de productos (memory/database).
 */

const { ProductDao } = require("../mappers/productDao");
const { getMockData } = require("../db/dataStore");
const { getPrismaClient, isRecordNotFoundError } = require("../db/prismaClient");
const { calculateProductStatus } = require("../utils/helpers");
const { createRepository } = require("./factory");

/**
 * Borrado logico, por el mismo motivo que en clientes: sale_items referencia
 * productos y la base de datos no deja destruir la fila referenciada. Ver el
 * encabezado de customerRepository.js.
 */
const estaActivo = (product) => !product.deletedAt;

class InMemoryProductRepository {
  async list() {
    return getMockData().products.filter(estaActivo);
  }

  async findById(id) {
    return (
      getMockData().products.find(
        (product) => product.id === id && estaActivo(product)
      ) || null
    );
  }

  /** Resuelve tambien los borrados, para leer los datos desde una venta pasada. */
  async findByIdIncludingDeleted(id) {
    return getMockData().products.find((product) => product.id === id) || null;
  }

  async findManyByIds(ids) {
    const idSet = new Set(ids);
    return getMockData().products.filter(
      (product) => idSet.has(product.id) && estaActivo(product)
    );
  }

  async create(payload) {
    const products = getMockData().products;
    const nextId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const product = ProductDao.createFromPayload(payload, nextId, calculateProductStatus);

    products.push(product);

    return product;
  }

  async update(id, updates) {
    const products = getMockData().products;
    const productIndex = products.findIndex((product) => product.id === id);

    if (productIndex === -1) {
      return null;
    }

    const nextProduct = ProductDao.mergeUpdates(
      products[productIndex],
      updates,
      calculateProductStatus
    );

    products[productIndex] = nextProduct;

    return nextProduct;
  }

  async delete(id) {
    const product = getMockData().products.find((item) => item.id === id);

    if (!product || !estaActivo(product)) {
      return null;
    }

    product.deletedAt = new Date().toISOString();

    return product;
  }

  /**
   * Reserva el stock de todas las lineas o no reserva ninguna.
   *
   * Sustituye al par "leer y despues escribir" que permitia que dos ventas
   * simultaneas se llevaran la misma unidad: aqui la comprobacion y el
   * descuento ocurren juntos.
   * @returns {{ok: true}|{ok: false, productId, availableStock, requestedQuantity}}
   */
  async reserveStock(items, saleDate) {
    const reservadas = [];

    for (const item of items) {
      const product = getMockData().products.find(
        (candidato) => candidato.id === item.productId && estaActivo(candidato)
      );

      if (!product || product.stock < item.quantity) {
        // O se reserva todo, o nada: se devuelve lo ya descontado.
        await this.releaseStock(reservadas);
        return {
          ok: false,
          productId: item.productId,
          availableStock: product ? product.stock : 0,
          requestedQuantity: item.quantity,
        };
      }

      product.stock -= item.quantity;
      product.sales = (product.sales || 0) + item.quantity;
      product.lastSale = saleDate;
      product.status = calculateProductStatus(product.stock);
      product.updatedAt = new Date().toISOString();
      reservadas.push(item);
    }

    return { ok: true };
  }

  /** Devuelve el stock reservado cuando la venta no llega a registrarse. */
  async releaseStock(items) {
    for (const item of items) {
      // Incluye los borrados: si el producto se dio de baja entre la reserva y
      // la devolucion, la cifra tiene que volver a cuadrar igual.
      const product = getMockData().products.find(
        (candidato) => candidato.id === item.productId
      );
      if (!product) continue;
      product.stock += item.quantity;
      product.sales = Math.max((product.sales || 0) - item.quantity, 0);
      product.status = calculateProductStatus(product.stock);
      product.updatedAt = new Date().toISOString();
    }
  }
}

class DatabaseProductRepository {
  async list() {
    return getPrismaClient().product.findMany({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
    });
  }

  async findById(id) {
    return getPrismaClient().product.findFirst({ where: { id, deletedAt: null } });
  }

  /** Resuelve tambien los borrados, para leer los datos desde una venta pasada. */
  async findByIdIncludingDeleted(id) {
    return getPrismaClient().product.findUnique({ where: { id } });
  }

  async findManyByIds(ids) {
    return getPrismaClient().product.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
  }

  async create(payload) {
    const now = new Date().toISOString();
    const stock = parseInt(payload.stock, 10);

    return getPrismaClient().product.create({
      data: {
        name: payload.name,
        category: payload.category,
        price: parseFloat(payload.price),
        stock,
        status: calculateProductStatus(stock),
        lastSale: now.split("T")[0],
        sales: 0,
      },
    });
  }

  async update(id, updates) {
    const data = {};

    if (updates.name) data.name = updates.name;
    if (updates.category) data.category = updates.category;
    if (updates.price !== undefined) data.price = parseFloat(updates.price);

    if (updates.stock !== undefined) {
      data.stock = parseInt(updates.stock, 10);
      data.status = calculateProductStatus(data.stock);
    }

    try {
      return await getPrismaClient().product.update({ where: { id }, data });
    } catch (error) {
      if (isRecordNotFoundError(error)) return null;
      throw error;
    }
  }

  async delete(id) {
    const { count } = await getPrismaClient().product.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (count === 0) {
      return null;
    }

    return getPrismaClient().product.findUnique({ where: { id } });
  }

  /**
   * Reserva el stock de todas las lineas o no reserva ninguna.
   *
   * El descuento va en un UPDATE condicional (`stock >= cantidad`) de una sola
   * instruccion: decide la base de datos, y dos ventas simultaneas de la ultima
   * unidad ya no pueden ganar las dos. Si una linea no alcanza, se devuelve lo
   * ya reservado.
   * @returns {{ok: true}|{ok: false, productId, availableStock, requestedQuantity}}
   */
  async reserveStock(items, saleDate) {
    const prisma = getPrismaClient();
    const reservadas = [];

    for (const item of items) {
      const { count } = await prisma.product.updateMany({
        where: { id: item.productId, deletedAt: null, stock: { gte: item.quantity } },
        data: {
          stock: { decrement: item.quantity },
          sales: { increment: item.quantity },
          lastSale: saleDate,
        },
      });

      if (count === 0) {
        await this.releaseStock(reservadas);
        const actual = await this.findById(item.productId);
        return {
          ok: false,
          productId: item.productId,
          availableStock: actual ? actual.stock : 0,
          requestedQuantity: item.quantity,
        };
      }

      reservadas.push(item);
      await this.refreshStatus(item.productId);
    }

    return { ok: true };
  }

  /** Devuelve el stock reservado cuando la venta no llega a registrarse. */
  async releaseStock(items) {
    const prisma = getPrismaClient();
    for (const item of items) {
      await prisma.product.updateMany({
        where: { id: item.productId },
        data: {
          stock: { increment: item.quantity },
          sales: { decrement: item.quantity },
        },
      });
      await this.refreshStatus(item.productId);
    }
  }

  /**
   * `status` se deriva del stock y Prisma no puede calcularlo dentro del mismo
   * UPDATE condicional, asi que se refresca justo despues. Lo que debe ser
   * atomico es el descuento, no esta etiqueta derivada.
   */
  async refreshStatus(id) {
    const prisma = getPrismaClient();
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return;
    const status = calculateProductStatus(product.stock);
    if (status !== product.status) {
      await prisma.product.update({ where: { id }, data: { status } });
    }
  }
}

const createProductRepository = () =>
  createRepository(InMemoryProductRepository, DatabaseProductRepository);

module.exports = {
  InMemoryProductRepository,
  DatabaseProductRepository,
  createProductRepository,
};
