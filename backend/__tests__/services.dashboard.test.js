const {
  formatMoneyShort,
  toDateKey,
  buildDailyTrend,
  buildMonthlyTrend,
  buildProductSales,
  buildTopProducts,
  buildBranchSales,
  buildCategoryDistribution,
  buildCustomerSegments,
  buildDynamicDashboardData,
} = require("../src/services/dashboardService");

const makeSale = (overrides = {}) => ({
  id: 1,
  customerId: 1,
  status: "Completada",
  createdAt: "2026-03-04T10:00:00.000Z",
  total: 100,
  items: [{ productId: 1, name: "Producto A", quantity: 1, total: 100 }],
  ...overrides,
});

describe("dashboardService", () => {
  describe("formatMoneyShort", () => {
    it("formatea valores en millones", () => {
      expect(formatMoneyShort(2_500_000)).toBe("2.5M Bs.");
    });

    it("formatea valores en miles", () => {
      expect(formatMoneyShort(4_200)).toBe("4.2K Bs.");
    });

    it("formatea valores menores a mil sin sufijo", () => {
      expect(formatMoneyShort(150)).toBe("150.00 Bs.");
    });

    it("formatea valores negativos usando el valor absoluto para el umbral", () => {
      expect(formatMoneyShort(-2_000_000)).toBe("-2.0M Bs.");
    });
  });

  describe("toDateKey", () => {
    it("retorna la fecha en formato YYYY-MM-DD", () => {
      expect(toDateKey("2026-03-04T10:20:00.000Z")).toBe("2026-03-04");
    });
  });

  describe("buildDailyTrend", () => {
    it("agrupa ventas por día y limita a los últimos 7 días", () => {
      const sales = Array.from({ length: 10 }, (_, i) =>
        makeSale({
          id: i + 1,
          createdAt: `2026-03-${String(i + 1).padStart(2, "0")}T10:00:00.000Z`,
          total: 10,
        })
      );

      const trend = buildDailyTrend(sales);
      expect(trend.length).toBe(7);
      expect(trend[trend.length - 1]).not.toHaveProperty("_date");
    });

    it("suma revenue y orders para ventas del mismo día", () => {
      const sales = [
        makeSale({ id: 1, total: 50 }),
        makeSale({ id: 2, total: 30 }),
      ];

      const [day] = buildDailyTrend(sales);
      expect(day.revenue).toBe(80);
      expect(day.orders).toBe(2);
    });
  });

  describe("buildMonthlyTrend", () => {
    it("agrupa por mes y limita a los últimos 6 meses", () => {
      const sales = Array.from({ length: 8 }, (_, i) =>
        makeSale({
          id: i + 1,
          createdAt: `2026-${String(i + 1).padStart(2, "0")}-01T10:00:00.000Z`,
          total: 10,
        })
      );

      const trend = buildMonthlyTrend(sales);
      expect(trend.length).toBe(6);
    });
  });

  describe("buildProductSales", () => {
    it("acumula cantidad y revenue por producto, limitando a 8", () => {
      const sales = Array.from({ length: 10 }, (_, i) =>
        makeSale({
          id: i + 1,
          items: [{ productId: i + 1, name: `Producto ${i + 1}`, quantity: 1, total: 10 }],
        })
      );

      const productSales = buildProductSales(sales);
      expect(productSales.length).toBe(8);
    });
  });

  describe("buildTopProducts (fudge factor -50)", () => {
    it("asigna trend +50% al producto con mayor revenue (mejor == mejor)", () => {
      const sales = [
        makeSale({
          id: 1,
          items: [{ productId: 1, name: "Top", quantity: 5, total: 1000 }],
        }),
      ];

      const [top] = buildTopProducts(sales);
      expect(top.trend).toBe("+50%");
    });

    it("centra el porcentaje de participación alrededor de 0", () => {
      const sales = [
        makeSale({
          id: 1,
          items: [{ productId: 1, name: "Top", quantity: 5, total: 1000 }],
        }),
        makeSale({
          id: 2,
          items: [{ productId: 2, name: "Mitad", quantity: 5, total: 500 }],
        }),
      ];

      const products = buildTopProducts(sales);
      const mitad = products.find((p) => p.name === "Mitad");
      expect(mitad.trend).toBe("+0%");
    });

    it("asigna trend negativo a productos con revenue muy por debajo del mejor", () => {
      const sales = [
        makeSale({
          id: 1,
          items: [{ productId: 1, name: "Top", quantity: 5, total: 1000 }],
        }),
        makeSale({
          id: 2,
          items: [{ productId: 2, name: "Bajo", quantity: 1, total: 100 }],
        }),
      ];

      const products = buildTopProducts(sales);
      const bajo = products.find((p) => p.name === "Bajo");
      expect(bajo.trend).toBe("-40%");
    });

    it("retorna arreglo vacío cuando no hay ventas", () => {
      expect(buildTopProducts([])).toEqual([]);
    });
  });

  describe("buildBranchSales", () => {
    it("agrupa por ciudad del cliente y calcula porcentaje de participación", () => {
      const customers = [{ id: 1, city: "La Paz" }, { id: 2, city: "Oruro" }];
      const sales = [
        makeSale({ id: 1, customerId: 1, total: 100 }),
        makeSale({ id: 2, customerId: 2, total: 100 }),
      ];

      const branches = buildBranchSales(sales, customers);
      expect(branches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "Sucursal La Paz", value: 50 }),
          expect.objectContaining({ name: "Sucursal Oruro", value: 50 }),
        ])
      );
    });

    it("usa 'General' cuando el cliente no existe", () => {
      const sales = [makeSale({ id: 1, customerId: 999, total: 100 })];
      const [branch] = buildBranchSales(sales, []);
      expect(branch.name).toBe("Sucursal General");
    });
  });

  describe("buildCategoryDistribution", () => {
    it("agrupa items por categoría de producto", () => {
      const products = [{ id: 1, category: "Electrónica" }];
      const sales = [makeSale({ items: [{ productId: 1, quantity: 4, total: 100 }] })];

      const [category] = buildCategoryDistribution(sales, products);
      expect(category.name).toBe("Electrónica");
      expect(category.value).toBe(100);
    });

    it("usa 'Otros' cuando el producto no existe", () => {
      const sales = [makeSale({ items: [{ productId: 999, quantity: 1, total: 10 }] })];
      const [category] = buildCategoryDistribution(sales, []);
      expect(category.name).toBe("Otros");
    });
  });

  describe("buildCustomerSegments (umbrales exactos)", () => {
    it("clasifica exactamente 3000 como VIP", () => {
      const segments = buildCustomerSegments([{ totalSpent: 3000 }]);
      const vip = segments.find((s) => s.segment === "VIP");
      expect(vip.count).toBe(1);
    });

    it("clasifica exactamente 1500 como Frecuente", () => {
      const segments = buildCustomerSegments([{ totalSpent: 1500 }]);
      const frecuente = segments.find((s) => s.segment === "Frecuente");
      expect(frecuente.count).toBe(1);
    });

    it("clasifica exactamente 500 como Regular", () => {
      const segments = buildCustomerSegments([{ totalSpent: 500 }]);
      const regular = segments.find((s) => s.segment === "Regular");
      expect(regular.count).toBe(1);
    });

    it("clasifica justo debajo de 500 como Nuevo", () => {
      const segments = buildCustomerSegments([{ totalSpent: 499.99 }]);
      const nuevo = segments.find((s) => s.segment === "Nuevo");
      expect(nuevo.count).toBe(1);
    });

    it("clasifica justo debajo de 1500 como Regular", () => {
      const segments = buildCustomerSegments([{ totalSpent: 1499.99 }]);
      const regular = segments.find((s) => s.segment === "Regular");
      expect(regular.count).toBe(1);
    });

    it("clasifica justo debajo de 3000 como Frecuente", () => {
      const segments = buildCustomerSegments([{ totalSpent: 2999.99 }]);
      const frecuente = segments.find((s) => s.segment === "Frecuente");
      expect(frecuente.count).toBe(1);
    });
  });

  describe("buildDynamicDashboardData", () => {
    it("excluye ventas anuladas de las métricas principales", () => {
      const sales = [
        makeSale({ id: 1, status: "Completada", total: 100 }),
        makeSale({ id: 2, status: "Anulada", total: 500 }),
      ];

      const result = buildDynamicDashboardData({ products: [], customers: [], sales });
      expect(result.totalOrders).toBe(1);
    });

    it("solo incluye ventas 'Completada' en topProducts", () => {
      const sales = [
        makeSale({ id: 1, status: "Pendiente", total: 100 }),
      ];

      const result = buildDynamicDashboardData({ products: [], customers: [], sales });
      expect(result.topProducts).toEqual([]);
    });

    it("retorna averageTicket '0.00' cuando no hay ventas válidas", () => {
      const result = buildDynamicDashboardData({ products: [], customers: [], sales: [] });
      expect(result.averageTicket).toBe("0.00");
      expect(result.totalOrders).toBe(0);
    });
  });
});
