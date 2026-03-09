/**
 * Product Repository
 * Capa de acceso a datos de productos (memory/database).
 */

const { ProductDao } = require("../dao/productDao");
const { getMockData } = require("../db/dataStore");
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
    throw new Error("DatabaseProductRepository not implemented yet");
  }

  async findById(_id) {
    throw new Error("DatabaseProductRepository not implemented yet");
  }

  async findManyByIds(_ids) {
    throw new Error("DatabaseProductRepository not implemented yet");
  }

  async create(_payload) {
    throw new Error("DatabaseProductRepository not implemented yet");
  }

  async update(_id, _updates) {
    throw new Error("DatabaseProductRepository not implemented yet");
  }

  async delete(_id) {
    throw new Error("DatabaseProductRepository not implemented yet");
  }

  async applySaleImpact(_items, _saleDate) {
    throw new Error("DatabaseProductRepository not implemented yet");
  }
}

const createProductRepository = () => {
  const provider = process.env.DATA_REPOSITORY || "memory";

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
