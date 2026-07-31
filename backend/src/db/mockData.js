/**
 * Mock Data - Datos simulados para la aplicación
 * En producción, estos datos vendrían de una base de datos real
 */

const { calculateProductStatus } = require("../utils/helpers");

const pad2 = (n) => String(n).padStart(2, "0");

const mockData = {
  dailySales: "0.7M Bs.",
  totalOrders: 184,
  activeCustomers: 126,
  averageTicket: "1,980 Bs.",
  branchSales: [
    { name: "Sucursal La Paz", value: 32, revenue: 12500 },
    { name: "Sucursal Santa Cruz", value: 28, revenue: 10800 },
    { name: "Sucursal Cochabamba", value: 22, revenue: 9200 },
    { name: "Sucursal Oruro", value: 18, revenue: 7100 },
  ],
  salesTrend: [
    { day: "Lun", sales: 7, revenue: 6200, orders: 58 },
    { day: "Mar", sales: 9, revenue: 7400, orders: 71 },
    { day: "Mié", sales: 8, revenue: 6900, orders: 63 },
    { day: "Jue", sales: 11, revenue: 8900, orders: 82 },
  ],
  productSales: [
    {
      product: "Computadora Portátil",
      quantity: 17,
      revenue: 8500,
      category: "Electrónica",
    },
    {
      product: "Monitor LG 27''",
      quantity: 14,
      revenue: 5320,
      category: "Electrónica",
    },
    {
      product: "Sofá 3 Personas",
      quantity: 8,
      revenue: 5599,
      category: "Hogar",
    },
    {
      product: "Teclado Mecánico",
      quantity: 21,
      revenue: 3149,
      category: "Deportes",
    },
  ],
  monthlySales: [
    { month: "Ene", sales: 70, revenue: 30500 },
    { month: "Feb", sales: 78, revenue: 33600 },
    { month: "Mar", sales: 82, revenue: 35100 },
    { month: "Abr", sales: 90, revenue: 38400 },
  ],
  categoryDistribution: [
    { name: "Electrónica", value: 46, items: 96 },
    { name: "Hogar", value: 24, items: 34 },
    { name: "Deportes", value: 18, items: 22 },
    { name: "Otros", value: 12, items: 16 },
  ],
  customerSegments: [
    { segment: "VIP", count: 18, revenue: 12400 },
    { segment: "Frecuente", count: 42, revenue: 9900 },
    { segment: "Regular", count: 50, revenue: 5700 },
    { segment: "Nuevo", count: 16, revenue: 1800 },
  ],
  topProducts: [
    { name: "Laptop Dell XPS 13", sales: 17, revenue: 16999.83, trend: "+7%" },
    { name: "Monitor LG 27''", sales: 14, revenue: 5319.86, trend: "+5%" },
    { name: "Teclado Mecánico", sales: 21, revenue: 3149.79, trend: "+10%" },
    { name: "Sofá 3 Personas", sales: 8, revenue: 5599.92, trend: "-2%" },
  ],
  products: [
    {
      id: 1,
      name: "Laptop Dell XPS 13",
      category: "Electrónica",
      price: 999.99,
      stock: 18,
      status: "En Stock",
      lastSale: "2026-03-03",
      sales: 17,
    },
    {
      id: 2,
      name: "Monitor LG 27''",
      category: "Electrónica",
      price: 379.99,
      stock: 10,
      status: "Bajo Stock",
      lastSale: "2026-03-04",
      sales: 14,
    },
    {
      id: 3,
      name: "Sofá 3 Personas",
      category: "Hogar",
      price: 699.99,
      stock: 6,
      status: "Bajo Stock",
      lastSale: "2026-03-02",
      sales: 8,
    },
    {
      id: 4,
      name: "Teclado Mecánico",
      category: "Electrónica",
      price: 149.99,
      stock: 26,
      status: "En Stock",
      lastSale: "2026-03-04",
      sales: 21,
    },
  ],
  customers: [
    {
      id: 1,
      name: "Juan García",
      email: "juan.garcia@email.com",
      phone: "+591 22123456",
      address: "Avenida Mariscal Santa Cruz 1245, Piso 3",
      city: "La Paz",
      postalCode: "LP-01",
      status: "Activo",
      registeredDate: "2025-01-15",
      totalSpent: 2140.5,
      purchases: 5,
      lastPurchase: "2026-03-03",
    },
    {
      id: 2,
      name: "María López",
      email: "maria.lopez@email.com",
      phone: "+591 33234567",
      address: "Calle Pdte. Sucre 567, Santa Cruz Centro",
      city: "Santa Cruz de la Sierra",
      postalCode: "SC-02",
      status: "Activo",
      registeredDate: "2025-02-20",
      totalSpent: 3320.75,
      purchases: 7,
      lastPurchase: "2026-03-04",
    },
    {
      id: 3,
      name: "Carlos Fernández",
      email: "carlos.fern@email.com",
      phone: "+591 44345678",
      address: "Avenida Oquendo 890, Cochabamba",
      city: "Cochabamba",
      postalCode: "CB-03",
      status: "Inactivo",
      registeredDate: "2024-11-10",
      totalSpent: 980.25,
      purchases: 5,
      lastPurchase: "2026-02-15",
    },
    {
      id: 4,
      name: "Ana Martínez",
      email: "ana.martinez@email.com",
      phone: "+591 22456789",
      address: "Calle Comercio 321, La Paz",
      city: "La Paz",
      postalCode: "LP-04",
      status: "Activo",
      registeredDate: "2025-05-08",
      totalSpent: 3850.0,
      purchases: 9,
      lastPurchase: "2026-03-02",
    },
    {
      id: 5,
      name: "Luis Rojas",
      email: "luis.rojas@email.com",
      phone: "+591 33456789",
      address: "Av. Banzer 1200, Santa Cruz",
      city: "Santa Cruz de la Sierra",
      postalCode: "SC-05",
      status: "Pendiente",
      registeredDate: "2026-01-18",
      totalSpent: 420.5,
      purchases: 1,
      lastPurchase: "2026-02-28",
    },
  ],
  sales: [
    {
      id: 1,
      customerId: 1,
      customerName: "Juan García",
      items: [
        {
          productId: 1,
          name: "Laptop Dell XPS 13",
          quantity: 1,
          price: 999.99,
          total: 999.99,
        },
        {
          productId: 4,
          name: "Teclado Mecánico",
          quantity: 2,
          price: 149.99,
          total: 299.98,
        },
      ],
      subtotal: 1299.97,
      tax: 169,
      discount: 0,
      total: 1468.97,
      status: "Completada",
      paymentMethod: "Tarjeta",
      notes: "Entrega programada",
      createdAt: "2026-03-04T10:20:00.000Z",
      updatedAt: "2026-03-04T10:20:00.000Z",
    },
    {
      id: 2,
      customerId: 2,
      customerName: "María López",
      items: [
        {
          productId: 3,
          name: "Sofá 3 Personas",
          quantity: 1,
          price: 699.99,
          total: 699.99,
        },
      ],
      subtotal: 699.99,
      tax: 91.0,
      discount: 50,
      total: 740.99,
      status: "Pendiente",
      paymentMethod: "Transferencia",
      notes: "Pendiente de confirmación",
      createdAt: "2026-03-03T15:45:00.000Z",
      updatedAt: "2026-03-03T15:45:00.000Z",
    },
    {
      id: 3,
      customerId: 4,
      customerName: "Ana Martínez",
      items: [
        {
          productId: 2,
          name: "Monitor LG 27''",
          quantity: 1,
          price: 379.99,
          total: 379.99,
        },
      ],
      subtotal: 379.99,
      tax: 49.4,
      discount: 0,
      total: 429.39,
      status: "Anulada",
      paymentMethod: "Efectivo",
      notes: "Cliente canceló",
      createdAt: "2026-03-02T09:10:00.000Z",
      updatedAt: "2026-03-02T10:05:00.000Z",
    },
  ],
};

// ---------------------------------------------------------------------------
// Datos extra generados (append-only, nunca reasignan ids 1-4/1-5/1-3 de
// arriba, que varios tests referencian directamente). Objetivo: catálogo
// mas grande para poder probar paginación con datos realistas.
// ---------------------------------------------------------------------------

const PRODUCT_CATALOG = [
  ["Mouse Inalámbrico Logitech", "Electrónica", 39.99],
  ["Audífonos Sony WH-1000XM4", "Electrónica", 299.99],
  ["Tablet Samsung Galaxy Tab", "Electrónica", 449.99],
  ["Smartwatch Xiaomi Mi Band", "Electrónica", 49.99],
  ["Cámara Web Logitech C920", "Electrónica", 89.99],
  ["Disco SSD 1TB Samsung", "Electrónica", 109.99],
  ["Router WiFi TP-Link", "Electrónica", 69.99],
  ["Parlante Bluetooth JBL", "Electrónica", 79.99],
  ["Impresora Multifuncional Epson", "Electrónica", 159.99],
  ["Cargador Portátil 20000mAh", "Electrónica", 34.99],
  ["Mesa de Comedor 6 Puestos", "Hogar", 549.99],
  ["Refrigeradora Samsung 400L", "Hogar", 899.99],
  ["Microondas LG 20L", "Hogar", 129.99],
  ["Aspiradora Robot Xiaomi", "Hogar", 259.99],
  ["Juego de Sábanas King", "Hogar", 59.99],
  ["Lámpara de Piso LED", "Hogar", 44.99],
  ["Set de Ollas Antiadherentes", "Hogar", 89.99],
  ["Bicicleta Montaña Trek", "Deportes", 599.99],
  ["Balón de Fútbol Nike", "Deportes", 34.99],
  ["Mancuernas Ajustables 20kg", "Deportes", 119.99],
  ["Colchoneta de Yoga", "Deportes", 24.99],
  ["Zapatillas Running Adidas", "Deportes", 89.99],
  ["Bolsa de Boxeo", "Deportes", 149.99],
  ["Silla Ergonómica Ejecutiva", "Oficina", 249.99],
  ["Escritorio Gamer", "Oficina", 199.99],
  ["Impresora HP LaserJet", "Oficina", 179.99],
  ["Organizador de Escritorio", "Oficina", 19.99],
  ["Pizarra Blanca 90x60", "Oficina", 39.99],
  ["Calculadora Científica Casio", "Oficina", 24.99],
  ["Archivador Metálico 4 Gavetas", "Oficina", 129.99],
  ["Lámpara de Escritorio LED", "Oficina", 29.99],
  ["Chaqueta Impermeable North Face", "Ropa", 159.99],
  ["Jeans Levi's 501", "Ropa", 79.99],
  ["Zapatos de Vestir Cuero", "Ropa", 99.99],
  ["Mochila Antirrobo", "Ropa", 69.99],
  ["Reloj de Pulsera Casio", "Ropa", 49.99],
];

const buildGeneratedProducts = (startId) =>
  PRODUCT_CATALOG.map(([name, category, price], index) => {
    const id = startId + index;
    // Stock 0 cada 9 productos para tener tambien casos "Sin Stock" de ejemplo.
    const stock = id % 9 === 0 ? 0 : 3 + ((id * 5) % 40);
    const sales = 1 + ((id * 3) % 35);
    const lastSaleDay = 1 + (id % 28);

    return {
      id,
      name,
      category,
      price,
      stock,
      status: calculateProductStatus(stock),
      lastSale: `2026-03-${pad2(lastSaleDay)}`,
      sales,
    };
  });

const CUSTOMER_CATALOG = [
  ["Patricia Vargas", "Sucre", "64"],
  ["Roberto Quispe", "El Alto", "22"],
  ["Carmen Mamani", "Oruro", "25"],
  ["Jorge Choque", "Potosí", "26"],
  ["Silvia Rocabado", "Tarija", "66"],
  ["Fernando Chávez", "La Paz", "22"],
  ["Gabriela Terán", "Santa Cruz de la Sierra", "33"],
  ["Ricardo Flores", "Cochabamba", "44"],
  ["Daniela Salazar", "La Paz", "22"],
  ["Miguel Ángel Poma", "El Alto", "22"],
  ["Verónica Cruz", "Santa Cruz de la Sierra", "33"],
  ["Andrés Villca", "Oruro", "25"],
  ["Paola Guzmán", "Sucre", "64"],
  ["Diego Mendoza", "Cochabamba", "44"],
  ["Claudia Ríos", "Tarija", "66"],
];

const CITY_POSTAL_PREFIX = {
  "La Paz": "LP",
  "Santa Cruz de la Sierra": "SC",
  Cochabamba: "CB",
  Sucre: "SU",
  Oruro: "OR",
  Potosí: "PT",
  Tarija: "TJ",
  "El Alto": "EA",
};

const CUSTOMER_STATUS_CYCLE = ["Activo", "Activo", "Activo", "Inactivo", "Pendiente"];

const slugNameParts = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/);

const buildGeneratedCustomers = (startId) =>
  CUSTOMER_CATALOG.map(([name, city, areaCode], index) => {
    const id = startId + index;
    const parts = slugNameParts(name);
    const first = parts[0];
    const last = parts[parts.length - 1];
    const status = CUSTOMER_STATUS_CYCLE[id % CUSTOMER_STATUS_CYCLE.length];
    const purchases = 1 + (id % 12);
    const totalSpent = parseFloat((purchases * (180 + ((id * 37) % 420))).toFixed(2));
    const registeredMonth = 1 + (id % 12);
    const registeredDay = 1 + (id % 27);
    const lastPurchaseDay = 1 + (id % 28);

    return {
      id,
      name,
      email: `${first}.${last}@email.com`,
      phone: `+591 ${areaCode}${String(100000 + ((id * 913) % 900000)).slice(0, 6)}`,
      address: `Calle ${10 + (id % 40)} #${100 + ((id * 17) % 900)}, ${city}`,
      city,
      postalCode: `${CITY_POSTAL_PREFIX[city] || "BO"}-${pad2(id)}`,
      status,
      registeredDate: `2025-${pad2(registeredMonth)}-${pad2(registeredDay)}`,
      totalSpent,
      purchases,
      lastPurchase: `2026-03-${pad2(lastPurchaseDay)}`,
    };
  });

const SALE_STATUS_CYCLE = [
  "Completada",
  "Completada",
  "Completada",
  "Pendiente",
  "Completada",
  "Anulada",
  "Completada",
];
const PAYMENT_METHOD_CYCLE = ["Tarjeta", "Efectivo", "Transferencia", "QR"];
// Ancla fija (no Date.now()) para que el seed sea reproducible en cualquier
// momento en que corra `npm run db:seed` o los tests.
const SALE_DATE_ANCHOR = new Date("2026-07-30T18:00:00.000Z");

const saleDateMinusDays = (days, hour) => {
  const date = new Date(SALE_DATE_ANCHOR);
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, (days * 7) % 60, 0, 0);
  return date.toISOString();
};

const buildGeneratedSales = (startId, count, products, customers) =>
  Array.from({ length: count }, (_, index) => {
    const id = startId + index;
    const daysAgo = count - index; // la mas nueva queda casi al dia del ancla
    const customer = customers[id % customers.length];
    const itemCount = 1 + (id % 3);
    const items = Array.from({ length: itemCount }, (_, itemIndex) => {
      const product = products[(id * 3 + itemIndex) % products.length];
      const quantity = 1 + ((id + itemIndex) % 3);
      const total = parseFloat((product.price * quantity).toFixed(2));

      return {
        productId: product.id,
        name: product.name,
        quantity,
        price: product.price,
        total,
      };
    });

    const subtotal = parseFloat(
      items.reduce((sum, item) => sum + item.total, 0).toFixed(2)
    );
    const discount = id % 6 === 0 ? parseFloat((subtotal * 0.05).toFixed(2)) : 0;
    const tax = parseFloat((subtotal * 0.13).toFixed(2));
    const total = parseFloat((subtotal + tax - discount).toFixed(2));
    const status = SALE_STATUS_CYCLE[id % SALE_STATUS_CYCLE.length];
    const createdAt = saleDateMinusDays(daysAgo, 9 + (id % 9));

    return {
      id,
      customerId: customer.id,
      customerName: customer.name,
      items,
      subtotal,
      tax,
      discount,
      total,
      status,
      paymentMethod: PAYMENT_METHOD_CYCLE[id % PAYMENT_METHOD_CYCLE.length],
      notes: status === "Anulada" ? "Cliente canceló" : "",
      createdAt,
      updatedAt: createdAt,
    };
  });

mockData.products = [...mockData.products, ...buildGeneratedProducts(5)];
mockData.customers = [...mockData.customers, ...buildGeneratedCustomers(6)];
mockData.sales = [
  ...mockData.sales,
  ...buildGeneratedSales(4, 50, mockData.products, mockData.customers),
];

const users = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    role: "admin",
    name: "Administrador",
    cellphone: "+591 70000000",
    email: "admin@email.com",
    address: "La Paz",
  },
  {
    id: 2,
    username: "demo",
    password: "demo123",
    role: "vendedor",
    name: "Usuario Demo",
    cellphone: "+591 70000001",
    email: "demo@email.com",
    address: "Santa Cruz",
  },
  {
    id: 3,
    username: "test",
    password: "test123",
    role: "vendedor",
    name: "Usuario Test",
    cellphone: "+591 70000002",
    email: "test@email.com",
    address: "Cochabamba",
  },
];

module.exports = {
  mockData,
  users,
};
