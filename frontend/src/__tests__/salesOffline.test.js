import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SalesSection from "../components/SalesSection";
import { saleService, customerService, productService } from "../services/api";
import { PENDING_SALES_EVENT, enqueueSale, pendingSales } from "../utils/offlineSales";

jest.mock("../components/SalesForm", () => {
  const MockSalesForm = (props) => {
    if (!props.isOpen) return null;
    return (
      <div data-testid="sales-form">
        <button
          onClick={() =>
            Promise.resolve(props.onSave({ customerId: 1, items: [] })).catch(() => {})
          }
        >
          Submit
        </button>
      </div>
    );
  };
  return MockSalesForm;
});

jest.mock("../services/api", () => ({
  saleService: {
    getSales: jest.fn(),
    cancelSale: jest.fn(),
    createSale: jest.fn(),
  },
  customerService: {
    getCustomers: jest.fn(),
    getCities: jest.fn(),
    createCustomer: jest.fn(),
  },
  productService: {
    getProducts: jest.fn(),
  },
  handleApiError: jest.fn((error) => error?.message || "Error"),
}));

describe("SalesSection sin conexion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // setupTests.js reemplaza localStorage por funciones vacias: aqui la cola
    // necesita que guarde de verdad.
    const store = {};
    localStorage.getItem.mockImplementation((key) => (key in store ? store[key] : null));
    localStorage.setItem.mockImplementation((key, value) => {
      store[key] = String(value);
    });
    localStorage.removeItem.mockImplementation((key) => {
      delete store[key];
    });
    localStorage.setItem("user", JSON.stringify({ id: 5, username: "vendedor" }));
    saleService.getSales.mockResolvedValue({ data: [], count: 0, page: 1, totalPages: 1 });
    customerService.getCustomers.mockResolvedValue({ data: [] });
    customerService.getCities.mockResolvedValue({ data: [] });
    productService.getProducts.mockResolvedValue({ data: [] });
  });

  it("sin red guarda la venta con su clave y avisa que se enviara despues", async () => {
    const user = userEvent.setup();
    saleService.createSale.mockRejectedValue({ code: "ERR_NETWORK", message: "Network Error" });
    render(<SalesSection />);

    await user.click(await screen.findByRole("button", { name: /nueva venta/i }));
    await user.click(await screen.findByText("Submit"));

    expect(await screen.findByText(/1 venta\(s\) pendiente\(s\) de envío/i)).toBeInTheDocument();
    expect(screen.getByText(/la venta quedó guardada en este dispositivo/i)).toBeInTheDocument();
    expect(screen.queryByTestId("sales-form")).not.toBeInTheDocument();

    const [guardada] = pendingSales(5);
    const [, clave] = saleService.createSale.mock.calls[0];
    expect(guardada.idempotencyKey).toBe(clave);
    expect(guardada.sale).toEqual({ customerId: 1, items: [] });
  });

  it("al abrir la seccion envia lo pendiente con la misma clave", async () => {
    enqueueSale({ userId: 5, sale: { customerId: 1, items: [] }, idempotencyKey: "clave-guardada" });
    saleService.createSale.mockResolvedValue({});

    render(<SalesSection />);

    await waitFor(() =>
      expect(saleService.createSale).toHaveBeenCalledWith(
        { customerId: 1, items: [] },
        "clave-guardada"
      )
    );
    expect(await screen.findByText(/se enviaron 1 venta\(s\) guardada\(s\)/i)).toBeInTheDocument();
    expect(pendingSales(5)).toEqual([]);
  });

  it("informa las ventas rechazadas y permite reintentar las demas", async () => {
    const user = userEvent.setup();
    enqueueSale({ userId: 5, sale: { n: 1 }, idempotencyKey: "clave-1" });
    saleService.createSale.mockRejectedValue({ code: "ERR_NETWORK" });

    render(<SalesSection />);
    expect(await screen.findByText(/1 venta\(s\) pendiente\(s\)/i)).toBeInTheDocument();

    saleService.createSale.mockRejectedValue({
      response: { status: 400, data: { error: "Stock insuficiente para Producto A" } },
    });
    await user.click(screen.getByRole("button", { name: /reintentar ahora/i }));

    expect(
      await screen.findByText(/1 no se pudo registrar: Stock insuficiente para Producto A/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reintentar ahora/i })).not.toBeInTheDocument();
  });

  it("ignora un aviso de sincronizacion sin cambios", async () => {
    render(<SalesSection />);
    await screen.findByText("Ventas & Operaciones");

    act(() => {
      window.dispatchEvent(new CustomEvent(PENDING_SALES_EVENT, { detail: null }));
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
