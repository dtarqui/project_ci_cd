/**
 * Product Repository
 * Capa de acceso a datos de productos (memory/database).
 */

const { ProductDao } = require("../dao/productDao");
const { getMockData } = require("../db/dataStore");
const { getPrismaClient, isRecordNotFoundError } = require("../db/prismaClient");
const { calculateProductStatus } = require("../utils/helpers");

class InMemoryProductRepository {
  async list() {
    return [...getMockData().products];
  }

  async findById(id) {
    return getMockData().products.find((product) => product.id === id) || null;
  }

  async findManyByIds(ids) {
    const idSet = new Set(ids);
    return getMockData().products.filter((product) => idSet.has(product.id));
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
    const products = getMockData().products;
    const productIndex = products.findIndex((product) => product.id === id);

    if (productIndex === -1) {
      return null;
    }

    const [deletedProduct] = products.splice(productIndex, 1);
    return deletedProduct;
  }

  async applySaleImpact(items, saleDate) {
    for (const item of items) {
      const product = await this.findById(item.productId);

      if (!product) {
        continue;
      }

      product.stock = Math.max(product.stock - item.quantity, 0);
      product.sales = (product.sales || 0) + item.quantity;
      product.lastSale = saleDate;
      product.status = calculateProductStatus(product.stock);
      product.updatedAt = new Date().toISOString();
    }
  }
}

class DatabaseProductRepository {
  async list() {
    return getPrismaClient().product.findMany({ orderBy: { id: "asc" } });
  }

  async findById(id) {
    return getPrismaClient().product.findUnique({ where: { id } });
  }

  async findManyByIds(ids) {
    return getPrismaClient().product.findMany({ where: { id: { in: ids } } });
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
    try {
      return await getPrismaClient().product.delete({ where: { id } });
    } catch (error) {
      if (isRecordNotFoundError(error)) return null;
      throw error;
    }
  }

  async applySaleImpact(items, saleDate) {
    for (const item of items) {
      const product = await this.findById(item.productId);

      if (!product) {
        continue;
      }

      const nextStock = Math.max(product.stock - item.quantity, 0);

      await getPrismaClient().product.update({
        where: { id: product.id },
        data: {
          stock: nextStock,
          sales: (product.sales || 0) + item.quantity,
          lastSale: saleDate,
          status: calculateProductStatus(nextStock),
        },
      });
    }
  }
}

const createProductRepository = () => {
  const provider = process.env.REPOSITORY_MODE || "memory";

  if (provider === "database") {
    return new DatabaseProductRepository();
  }

  return new InMemoryProductRepository();
};

module.exports = {
  InMemoryProductRepository,
  DatabaseProductRepository,
  createProductRepository,
};
