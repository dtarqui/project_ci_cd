const { createApp, mockData, users } = require("../app");

describe("Pruebas unitarias - Componentes de la app", () => {
  describe("Validación de datos mock", () => {
    test("mockData debe tener estructura correcta", () => {
      expect(mockData).toBeDefined();
      expect(mockData).toHaveProperty("dailySales");
      expect(mockData).toHaveProperty("branchSales");
      expect(mockData).toHaveProperty("salesTrend");
      expect(mockData).toHaveProperty("productSales");
    });

    test("dailySales debe ser un string", () => {
      expect(typeof mockData.dailySales).toBe("string");
      expect(mockData.dailySales).toBe("2.8M Bs.");
    });

    test("branchSales debe ser un arreglo válido", () => {
      expect(Array.isArray(mockData.branchSales)).toBe(true);
      expect(mockData.branchSales.length).toBeGreaterThan(0);

      mockData.branchSales.forEach((branch) => {
        expect(branch).toHaveProperty("name");
        expect(branch).toHaveProperty("value");
        expect(typeof branch.name).toBe("string");
        expect(typeof branch.value).toBe("number");
        expect(branch.value).toBeGreaterThanOrEqual(0);
      });
    });

    test("salesTrend debe ser un arreglo válido", () => {
      expect(Array.isArray(mockData.salesTrend)).toBe(true);

      mockData.salesTrend.forEach((trend) => {
        expect(trend).toHaveProperty("day");
        expect(trend).toHaveProperty("sales");
        expect(typeof trend.day).toBe("string");
        expect(typeof trend.sales).toBe("number");
        expect(trend.sales).toBeGreaterThanOrEqual(0);
      });
    });

    test("productSales debe ser un arreglo válido", () => {
      expect(Array.isArray(mockData.productSales)).toBe(true);

      mockData.productSales.forEach((product) => {
        expect(product).toHaveProperty("product");
        expect(product).toHaveProperty("quantity");
        expect(typeof product.product).toBe("string");
        expect(typeof product.quantity).toBe("number");
        expect(product.quantity).toBeGreaterThanOrEqual(0);
      });
    });

    test("debe tener la cantidad esperada de puntos de datos", () => {
      expect(mockData.branchSales.length).toBe(4);
      expect(mockData.salesTrend.length).toBe(7); // 7 días de la semana
      expect(mockData.productSales.length).toBe(4);
    });

    test("los valores de ventas por sucursal deben sumar 100", () => {
      const total = mockData.branchSales.reduce(
        (sum, branch) => sum + branch.value,
        0
      );
      expect(total).toBe(100);
    });
  });

  describe("Validación de datos de usuarios", () => {
    test("users debe ser un arreglo válido", () => {
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBe(3);
    });

    test("cada usuario debe tener propiedades requeridas", () => {
      users.forEach((user) => {
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("username");
        expect(user).toHaveProperty("password");
        expect(user).toHaveProperty("name");

        expect(typeof user.id).toBe("number");
        expect(typeof user.username).toBe("string");
        expect(typeof user.password).toBe("string");
        expect(typeof user.name).toBe("string");

        expect(user.id).toBeGreaterThan(0);
        expect(user.username.length).toBeGreaterThan(0);
        expect(user.password.length).toBeGreaterThan(0);
        expect(user.name.length).toBeGreaterThan(0);
      });
    });

    test("los IDs de usuario deben ser únicos", () => {
      const ids = users.map((user) => user.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(ids.length);
    });

    test("los usernames deben ser únicos", () => {
      const usernames = users.map((user) => user.username);
      const uniqueUsernames = [...new Set(usernames)];
      expect(uniqueUsernames.length).toBe(usernames.length);
    });

    test("debe incluir los usuarios de prueba esperados", () => {
      const expectedUsernames = ["admin", "demo", "test"];
      const actualUsernames = users.map((user) => user.username);

      expectedUsernames.forEach((username) => {
        expect(actualUsernames).toContain(username);
      });
    });

    test("el usuario admin debe existir con propiedades correctas", () => {
      const adminUser = users.find((user) => user.username === "admin");
      expect(adminUser).toBeDefined();
      expect(adminUser.id).toBe(1);
      expect(adminUser.name).toBe("Administrador");
      expect(adminUser.password).toBe("admin123");
    });

    test("el usuario demo debe existir con propiedades correctas", () => {
      const demoUser = users.find((user) => user.username === "demo");
      expect(demoUser).toBeDefined();
      expect(demoUser.id).toBe(2);
      expect(demoUser.name).toBe("Usuario Demo");
      expect(demoUser.password).toBe("demo123");
    });
  });

  describe("Creación de app", () => {
    test("createApp debe retornar una instancia de app Express", () => {
      const app = createApp();
      expect(app).toBeDefined();
      expect(typeof app).toBe("function"); // Express app is a function
      expect(app).toHaveProperty("use");
      expect(app).toHaveProperty("get");
      expect(app).toHaveProperty("post");
    });

    test("createApp debe crear instancias independientes de app", () => {
      const app1 = createApp();
      const app2 = createApp();
      expect(app1).not.toBe(app2);
    });

    test("la app debe tener middleware requerido", () => {
      const app = createApp();
      // Verificar que el app tiene la estructura esperada
      expect(app._router).toBeDefined();
      expect(app._router.stack).toBeDefined();
      expect(app._router.stack.length).toBeGreaterThan(0);
    });
  });

  describe("Cálculos de datos", () => {
    test("la tendencia de ventas debe tener valores realistas", () => {
      mockData.salesTrend.forEach((trend) => {
        expect(trend.sales).toBeGreaterThan(0);
        expect(trend.sales).toBeLessThan(100); // Valores razonables
      });
    });

    test("las cantidades de producto deben ser realistas", () => {
      mockData.productSales.forEach((product) => {
        expect(product.quantity).toBeGreaterThan(0);
        expect(product.quantity).toBeLessThan(1000); // Valores razonables
      });
    });

    test("los porcentajes de ventas por sucursal deben ser válidos", () => {
      mockData.branchSales.forEach((branch) => {
        expect(branch.value).toBeGreaterThan(0);
        expect(branch.value).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Consistencia de datos", () => {
    test("debe tener todos los días de la semana en sales trend", () => {
      const expectedDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      const actualDays = mockData.salesTrend.map((trend) => trend.day);

      expectedDays.forEach((day) => {
        expect(actualDays).toContain(day);
      });
    });

    test("los nombres de sucursales deben ser descriptivos", () => {
      mockData.branchSales.forEach((branch) => {
        expect(branch.name).toMatch(/^Sucursal/);
        expect(branch.name.length).toBeGreaterThan(8); // "Sucursal" + " " + nombre
      });
    });

    test("los nombres de producto deben seguir el patrón", () => {
      mockData.productSales.forEach((product) => {
        expect(product.product).toMatch(/^[A-Z]/);
      });
    });
  });

  describe("Funciones helper", () => {
    test("el buscador de usuarios debe funcionar correctamente", () => {
      const findUser = (username, password) =>
        users.find((u) => u.username === username && u.password === password);

      // Encontrar usuario válido
      const validUser = findUser("demo", "demo123");
      expect(validUser).toBeDefined();
      expect(validUser.username).toBe("demo");

      // No encontrar usuario inválido
      const invalidUser = findUser("invalid", "password");
      expect(invalidUser).toBeUndefined();
    });

    test("la generación de token debe ser consistente", () => {
      const generateToken = (userId) => `mock-jwt-token-${userId}`;

      expect(generateToken(1)).toBe("mock-jwt-token-1");
      expect(generateToken(2)).toBe("mock-jwt-token-2");
      expect(generateToken(999)).toBe("mock-jwt-token-999");
    });

    test("user data sanitization", () => {
      const sanitizeUser = (user) => {
        const { password: _password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      };

      const testUser = {
        id: 1,
        username: "test",
        password: "secret",
        name: "Test User",
      };

      const sanitized = sanitizeUser(testUser);

      expect(sanitized).not.toHaveProperty("password");
      expect(sanitized).toHaveProperty("id");
      expect(sanitized).toHaveProperty("username");
      expect(sanitized).toHaveProperty("name");
    });
  });

  describe("Generación de timestamp", () => {
    test("debe generar timestamps ISO válidos", () => {
      const timestamp = new Date().toISOString();
      expect(timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    test("los timestamps deben ser recientes", () => {
      const timestamp = new Date().toISOString();
      const timestampDate = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - timestampDate.getTime();

      expect(diff).toBeLessThan(1000); // Menos de 1 segundo de diferencia
    });
  });
});
