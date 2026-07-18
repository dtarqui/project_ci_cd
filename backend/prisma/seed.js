/**
 * Prisma Seed
 * Siembra la base de datos "database" con los mismos datos demo que el
 * modo "memory" (mockData.js), para tener paridad entre ambos modos.
 * Uso: npm run db:seed  (requiere DATABASE_URL configurado)
 */

const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/repositories/userRepository");
const { mockData, users } = require("../src/db/mockData");

const prisma = new PrismaClient();

async function main() {
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  for (const user of users) {
    await prisma.user.create({
      data: {
        username: user.username,
        email: user.email,
        passwordHash: hashPassword(user.password),
        role: user.username === "admin" ? "admin" : "vendedor",
        name: user.name,
        phone: user.cellphone,
        address: user.address,
      },
    });
  }

  const productIdMap = new Map();
  for (const product of mockData.products) {
    const created = await prisma.product.create({
      data: {
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        status: product.status,
        lastSale: product.lastSale,
        sales: product.sales,
      },
    });
    productIdMap.set(product.id, created.id);
  }

  const customerIdMap = new Map();
  for (const customer of mockData.customers) {
    const created = await prisma.customer.create({
      data: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        postalCode: customer.postalCode,
        status: customer.status,
        registeredDate: customer.registeredDate,
        totalSpent: customer.totalSpent,
        purchases: customer.purchases,
        lastPurchase: customer.lastPurchase,
      },
    });
    customerIdMap.set(customer.id, created.id);
  }

  for (const sale of mockData.sales) {
    const customerId = customerIdMap.get(sale.customerId);

    if (!customerId) {
      continue;
    }

    await prisma.sale.create({
      data: {
        customerId,
        customerName: sale.customerName,
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        total: sale.total,
        status: sale.status,
        paymentMethod: sale.paymentMethod,
        notes: sale.notes,
        items: {
          create: sale.items
            .filter((item) => productIdMap.has(item.productId))
            .map((item) => ({
              productId: productIdMap.get(item.productId),
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
            })),
        },
      },
    });
  }

  console.log("Seed completado.");
}

main()
  .catch((error) => {
    console.error("Error al ejecutar el seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
