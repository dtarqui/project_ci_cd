/**
 * Customer Repository
 * Capa de acceso a datos de clientes (memory/database).
 */

const { CustomerDao } = require("../dao/customerDao");
const { getMockData } = require("../db/dataStore");
const { getPrismaClient, isRecordNotFoundError } = require("../db/prismaClient");

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
    return getPrismaClient().customer.findMany({ orderBy: { id: "asc" } });
  }

  async findById(id) {
    return getPrismaClient().customer.findUnique({ where: { id } });
  }

  async create(payload) {
    const now = new Date().toISOString();

    return getPrismaClient().customer.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        address: payload.address || "",
        city: payload.city || "",
        postalCode: payload.postalCode || "",
        status: "Activo",
        registeredDate: now.split("T")[0],
        totalSpent: 0,
        purchases: 0,
      },
    });
  }

  async update(id, updates) {
    const data = {};

    if (updates.name) data.name = updates.name;
    if (updates.email) data.email = updates.email;
    if (updates.phone) data.phone = updates.phone;
    if (updates.address !== undefined) data.address = updates.address;
    if (updates.city !== undefined) data.city = updates.city;
    if (updates.postalCode !== undefined) data.postalCode = updates.postalCode;
    if (updates.status) data.status = updates.status;

    try {
      return await getPrismaClient().customer.update({ where: { id }, data });
    } catch (error) {
      if (isRecordNotFoundError(error)) return null;
      throw error;
    }
  }

  async delete(id) {
    try {
      return await getPrismaClient().customer.delete({ where: { id } });
    } catch (error) {
      if (isRecordNotFoundError(error)) return null;
      throw error;
    }
  }

  async updateStats(id, { totalSpentDelta = 0, purchasesDelta = 0, lastPurchase }) {
    const customer = await this.findById(id);

    if (!customer) {
      return null;
    }

    const data = {
      totalSpent: parseFloat(((customer.totalSpent || 0) + totalSpentDelta).toFixed(2)),
      purchases: Math.max((customer.purchases || 0) + purchasesDelta, 0),
    };

    if (lastPurchase !== undefined) {
      data.lastPurchase = lastPurchase;
    }

    return getPrismaClient().customer.update({ where: { id }, data });
  }
}

const createCustomerRepository = () => {
  const provider = process.env.REPOSITORY_MODE || "memory";

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
