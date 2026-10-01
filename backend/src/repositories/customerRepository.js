/**
 * Customer Repository
 * Capa de acceso a datos de clientes (memory/database).
 */

const { CustomerDao } = require("../mappers/customerDao");
const { getMockData } = require("../db/dataStore");
const { getPrismaClient, isRecordNotFoundError } = require("../db/prismaClient");
const { createRepository } = require("./factory");

/**
 * Borrado logico: `deletedAt` con fecha significa borrado; null, activo.
 *
 * Por que no se borra de verdad: una venta guarda `customerId` y la base de datos
 * protege esa referencia (sales_customer_id_fkey, sin ON DELETE, o sea RESTRICT),
 * asi que destruir la fila fallaba con P2003 en cuanto el cliente tenia una venta.
 * En memoria no fallaba, que era peor: borraba y dejaba las ventas apuntando a un
 * cliente inexistente.
 *
 * Con la fila conservada, el historico sigue resolviendo y el cliente desaparece
 * de los listados y de los desplegables, que es lo que el usuario espera ver.
 */
const estaActivo = (customer) => !customer.deletedAt;

class InMemoryCustomerRepository {
  async list() {
    return getMockData().customers.filter(estaActivo);
  }

  async findById(id) {
    return (
      getMockData().customers.find(
        (customer) => customer.id === id && estaActivo(customer)
      ) || null
    );
  }

  /** Resuelve tambien los borrados, para leer los datos desde una venta pasada. */
  async findByIdIncludingDeleted(id) {
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
    const customer = getMockData().customers.find((item) => item.id === id);

    // Un cliente ya borrado se trata como inexistente: el segundo intento da 404.
    if (!customer || !estaActivo(customer)) {
      return null;
    }

    customer.deletedAt = new Date().toISOString();
    customer.updatedAt = customer.deletedAt;

    return customer;
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
    return getPrismaClient().customer.findMany({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
    });
  }

  async findById(id) {
    return getPrismaClient().customer.findFirst({ where: { id, deletedAt: null } });
  }

  /** Resuelve tambien los borrados, para leer los datos desde una venta pasada. */
  async findByIdIncludingDeleted(id) {
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
    // updateMany y no update: `where` admite deletedAt, asi que un cliente ya
    // borrado no cuenta y el segundo intento devuelve null en vez de volver a
    // marcarlo con otra fecha.
    const { count } = await getPrismaClient().customer.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (count === 0) {
      return null;
    }

    return getPrismaClient().customer.findUnique({ where: { id } });
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

const createCustomerRepository = () =>
  createRepository(InMemoryCustomerRepository, DatabaseCustomerRepository);

module.exports = {
  InMemoryCustomerRepository,
  DatabaseCustomerRepository,
  createCustomerRepository,
};
