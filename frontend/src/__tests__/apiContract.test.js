import React from "react";
import { act, renderHook } from "@testing-library/react";
import api, { customerService, ifMatchFor, productService, saleService } from "../services/api";
import { AuthProvider, useAuth } from "../context/AuthContext";

describe("cliente de la API", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("usa la version 1 de la API", async () => {
    const get = jest.spyOn(api, "get").mockResolvedValue({ data: {} });

    await productService.getProducts();
    await saleService.getSales("page=2");

    expect(get).toHaveBeenNthCalledWith(1, "/api/v1/products");
    expect(get).toHaveBeenNthCalledWith(2, "/api/v1/sales?page=2");
  });

  it("al editar envia If-Match con la version leida", async () => {
    const put = jest.spyOn(api, "put").mockResolvedValue({ data: {} });
    const updatedAt = "2026-11-18T12:00:00.000Z";

    await productService.updateProduct(3, { price: 1 }, updatedAt);
    expect(put).toHaveBeenLastCalledWith(
      "/api/v1/products/3",
      { price: 1 },
      { headers: { "If-Match": `"${Date.parse(updatedAt)}"` } }
    );

    // Sin version conocida, sin precondicion.
    await customerService.updateCustomer(4, { name: "x" });
    expect(put).toHaveBeenLastCalledWith("/api/v1/customers/4", { name: "x" }, undefined);
  });

  it("ignora una version que no es fecha", () => {
    expect(ifMatchFor("no es fecha")).toBeUndefined();
    expect(ifMatchFor(null)).toBeUndefined();
  });
});

describe("cierre de sesion", () => {
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  afterEach(() => {
    delete window.caches;
  });

  it("borra las lecturas guardadas para trabajar sin conexion", () => {
    window.caches = { delete: jest.fn().mockResolvedValue(true) };
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => result.current.logout());

    expect(window.caches.delete).toHaveBeenCalledWith("api-lecturas");
  });

  it("funciona en navegadores sin Cache Storage", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(() => act(() => result.current.logout())).not.toThrow();
  });
});
