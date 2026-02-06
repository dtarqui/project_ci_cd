import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SalesSection from "../components/SalesSection";
import { dashboardService } from "../services/api";

jest.mock("../components/SalesForm", () => (props) => {
  if (!props.isOpen) return null;
  return (
    <div data-testid="sales-form">
      <button onClick={() => props.onSave({ customerId: 1, items: [] })}>
        Submit
      </button>
      <button onClick={props.onClose}>Close</button>
    </div>
  );
});

jest.mock("../services/api", () => ({
  dashboardService: {
    getSales: jest.fn(),
    cancelSale: jest.fn(),
    getCustomers: jest.fn(),
    getProducts: jest.fn(),
    createSale: jest.fn(),
  },
  handleApiError: jest.fn((error) => error?.message || "Error"),
}));

describe("SalesSection Component", () => {
  const mockSales = [
    {
      id: 1,
      customerName: "Cliente A",
      total: 500,
      items: [{ productId: 1, name: "Producto A", price: 100, quantity: 2 }],
      status: "Completada",
      createdAt: "2026-02-05",
      paymentMethod: "Efectivo",
      subtotal: 400,
      tax: 52,
      discount: 0,
      notes: "Nota de prueba",
    },
    {
      id: 2,
      customerName: "Cliente B",
      total: 300,
      items: [{ productId: 2, name: "Producto B", price: 150, quantity: 2 }],
      status: "Pendiente",
      createdAt: "2026-02-06",
      paymentMethod: "Tarjeta",
      subtotal: 300,
      tax: 39,
      discount: 0,
      notes: "",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    dashboardService.getSales.mockResolvedValue({ data: mockSales });
    dashboardService.cancelSale.mockResolvedValue({
      data: { ...mockSales[0], status: "Anulada" },
    });
    dashboardService.getCustomers.mockResolvedValue({ data: [] });
    dashboardService.getProducts.mockResolvedValue({ data: [] });
    dashboardService.createSale.mockResolvedValue({});
  });

  it("debe renderizar el header", async () => {
    render(<SalesSection />);

    await waitFor(() => {
      expect(screen.getByText("Ventas & Operaciones")).toBeInTheDocument();
    });
  });

  it("debe mostrar métricas principales", async () => {
    const { container } = render(<SalesSection />);

    await waitFor(() => {
      expect(screen.getByText("Total de ventas")).toBeInTheDocument();
    });

    const totalCard = container.querySelector(".sales-card.accent");
    expect(totalCard).toBeInTheDocument();
    expect(within(totalCard).getByText("2")).toBeInTheDocument();
  });

  it("debe filtrar ventas por búsqueda", async () => {
    const user = userEvent.setup();
    render(<SalesSection />);

    await waitFor(() => {
      expect(screen.getByText("Cliente A")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar por cliente o id/i);
    await user.type(searchInput, "Cliente B");

    await waitFor(() => {
      expect(screen.getByText("Cliente B")).toBeInTheDocument();
      expect(screen.queryByText("Cliente A")).not.toBeInTheDocument();
    });
  });

  it("debe solicitar ventas por estado", async () => {
    const user = userEvent.setup();
    render(<SalesSection />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pendientes" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Pendientes" }));

    await waitFor(() => {
      const calls = dashboardService.getSales.mock.calls;
      const hasStatusCall = calls.some((call) =>
        String(call[0]).includes("status=Pendiente")
      );
      expect(hasStatusCall).toBe(true);
    });
  });

  it("debe mostrar detalle al seleccionar una venta", async () => {
    const user = userEvent.setup();
    render(<SalesSection />);

    await waitFor(() => {
      expect(screen.getByText("Cliente A")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Cliente A"));

    await waitFor(() => {
      expect(screen.getByText("Detalle de venta")).toBeInTheDocument();
      expect(screen.getByText("Efectivo")).toBeInTheDocument();
      expect(screen.getByText("Nota de prueba")).toBeInTheDocument();
    });
  });

  it("debe anular una venta cuando no está anulada", async () => {
    const user = userEvent.setup();
    render(<SalesSection />);

    await waitFor(() => {
      expect(screen.getByText("Cliente A")).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByRole("button", { name: /anular/i });
    await user.click(cancelButtons[0]);

    await waitFor(() => {
      expect(dashboardService.cancelSale).toHaveBeenCalledWith(1);
    });
  });

  it("debe abrir formulario y cargar opciones", async () => {
    const user = userEvent.setup();
    render(<SalesSection />);

    const newSaleButton = await screen.findByRole("button", { name: /nueva venta/i });
    await user.click(newSaleButton);

    await waitFor(() => {
      expect(dashboardService.getCustomers).toHaveBeenCalled();
      expect(dashboardService.getProducts).toHaveBeenCalled();
      expect(screen.getByTestId("sales-form")).toBeInTheDocument();
    });
  });

  it("debe crear venta desde el formulario", async () => {
    const user = userEvent.setup();
    render(<SalesSection />);

    const newSaleButton = await screen.findByRole("button", { name: /nueva venta/i });
    await user.click(newSaleButton);

    const submitButton = await screen.findByText("Submit");
    await user.click(submitButton);

    await waitFor(() => {
      expect(dashboardService.createSale).toHaveBeenCalled();
      expect(dashboardService.getSales).toHaveBeenCalled();
    });
  });
});
