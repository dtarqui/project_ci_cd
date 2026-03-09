/**
 * Customer Repository
 * Capa de acceso a datos de clientes (memory/database).
 */

const { CustomerDao } = require("../dao/customerDao");
const { getMockData } = require("../db/dataStore");

class InMemoryCustomerRepository {
  async list() {
    return [...getMockData().customers];
  }

  async findById(id) {
    return getMockData().customers.find((customer) => customer.id === id) || null;
  }

  async create(payload) {
    const customers = getMockData().customers;
    const nextId = customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1;
    const customer = CustomerDao.createFromPayload(payload, nextId);

    customers.push(customer);

    return customer;
  }

  async update(id, updates) {
    const customers = getMockData().customers;
    const customerIndex = customers.findIndex((customer) => customer.id === id);

    if (customerIndex === -1) {
      return null;
    }

    const nextCustomer = CustomerDao.mergeUpdates(customers[customerIndex], updates);
    customers[customerIndex] = nextCustomer;

    return nextCustomer;
  }

  async delete(id) {
    const customers = getMockData().customers;
    const customerIndex = customers.findIndex((customer) => customer.id === id);

    if (customerIndex === -1) {
      return null;
    }

    const [deletedCustomer] = customers.splice(customerIndex, 1);
    return deletedCustomer;
  }

  async updateStats(id, { totalSpentDelta = 0, purchasesDelta = 0, lastPurchase }) {
    const customer = await this.findById(id);

    if (!customer) {
      return null;
    }

    const nextTotalSpent = parseFloat(((customer.totalSpent || 0) + totalSpentDelta).toFixed(2));

    customer.totalSpent = nextTotalSpent;
    customer.purchases = Math.max((customer.purchases || 0) + purchasesDelta, 0);

    if (lastPurchase !== undefined) {
      customer.lastPurchase = lastPurchase;
    }

    customer.updatedAt = new Date().toISOString();

    return customer;
  }
}

class DatabaseCustomerRepository {
  async list() {
    throw new Error("DatabaseCustomerRepository not implemented yet");
  }

  async findById(_id) {
    throw new Error("DatabaseCustomerRepository not implemented yet");
  }

  async create(_payload) {
    throw new Error("DatabaseCustomerRepository not implemented yet");
  }

  async update(_id, _updates) {
    throw new Error("DatabaseCustomerRepository not implemented yet");
  }

  async delete(_id) {
    throw new Error("DatabaseCustomerRepository not implemented yet");
  }

  async updateStats(_id, _stats) {
    throw new Error("DatabaseCustomerRepository not implemented yet");
  }
}

const createCustomerRepository = () => {
  const provider = process.env.DATA_REPOSITORY || "memory";

  if (provider === "database") {
    return new DatabaseCustomerRepository();
  }

  return new InMemoryCustomerRepository();
};

module.exports = {
  InMemoryCustomerRepository,
  DatabaseCustomerRepository,
  createCustomerRepository,
};
