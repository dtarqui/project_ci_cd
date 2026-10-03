/**
 * Cobertura de la reserva de stock en modo memoria (REPOSITORY_MODE=memory).
 *
 * El contraparte de estas pruebas para Postgres está en
 * `repositories.database.test.js`. Se prueba la clase directamente porque la
 * comprobación previa de `salesService` intercepta estos casos antes de que la
 * reserva los vea: por la API solo se alcanzarían con una carrera real entre dos
 * peticiones simultáneas.
 */

const { InMemoryProductRepository } = require("../src/repositories/productRepository");
const { getMockData, resetDataStore } = require("../src/db/dataStore");

describe("InMemoryProductRepository: reserva de stock", () => {
  let repo;

  beforeEach(() => {
    resetDataStore();
    repo = new InMemoryProductRepository();
  });

  const producto = (id) => getMockData().products.find((p) => p.id === id);

  it("descuenta el stock y suma las unidades vendidas", async () => {
    const antes = producto(1).stock;

    const resultado = await repo.reserveStock([{ productId: 1, quantity: 2 }], "2026-10-02");

    expect(resultado).toEqual({ ok: true });
    expect(producto(1).stock).toBe(antes - 2);
    expect(producto(1).lastSale).toBe("2026-10-02");
  });

  it("rechaza la reserva cuando la cantidad supera el stock", async () => {
    const antes = producto(1).stock;

    const resultado = await repo.reserveStock(
      [{ productId: 1, quantity: antes + 1 }],
      "2026-10-02"
    );

    expect(resultado).toMatchObject({
      ok: false,
      productId: 1,
      availableStock: antes,
      requestedQuantity: antes + 1,
    });
    expect(producto(1).stock).toBe(antes);
  });

  // Lo que hace falta probar aquí: que una línea insuficiente no deje a medias
  // las anteriores. Sin esto, una venta rechazada bajaría el stock de los
  // primeros productos de todas formas.
  it("devuelve lo ya reservado si una línea posterior no alcanza", async () => {
    const stock1 = producto(1).stock;
    const stock2 = producto(2).stock;
    const ventas1 = producto(1).sales;

    const resultado = await repo.reserveStock(
      [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: stock2 + 5 },
      ],
      "2026-10-02"
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.productId).toBe(2);
    expect(producto(1).stock).toBe(stock1);
    expect(producto(1).sales).toBe(ventas1);
    expect(producto(2).stock).toBe(stock2);
  });

  it("rechaza la reserva de un producto dado de baja", async () => {
    await repo.delete(1);

    const resultado = await repo.reserveStock([{ productId: 1, quantity: 1 }], "2026-10-02");

    expect(resultado).toMatchObject({ ok: false, productId: 1, availableStock: 0 });
  });

  it("releaseStock() repone el stock incluso de un producto dado de baja", async () => {
    const antes = producto(1).stock;
    await repo.reserveStock([{ productId: 1, quantity: 2 }], "2026-10-02");
    await repo.delete(1);

    await repo.releaseStock([{ productId: 1, quantity: 2 }]);

    expect(producto(1).stock).toBe(antes);
  });

  it("releaseStock() ignora lineas cuyo producto ya no existe", async () => {
    await expect(repo.releaseStock([{ productId: 9999, quantity: 1 }])).resolves.toBeUndefined();
  });

  it("recalcula el status al quedarse sin stock y al reponerlo", async () => {
    const todo = producto(1).stock;

    await repo.reserveStock([{ productId: 1, quantity: todo }], "2026-10-02");
    expect(producto(1).status).toBe("Sin Stock");

    await repo.releaseStock([{ productId: 1, quantity: todo }]);
    expect(producto(1).status).not.toBe("Sin Stock");
  });
});
