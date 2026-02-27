import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../dashboard";
import { dashboardService } from "../services/api";

// Mock de componentes
jest.mock("../components/DashboardHeader", () => {
  return function DummyDashboardHeader() {
    return <div data-testid="dashboard-header">Dashboard Header</div>;
  };
});

jest.mock("../components/DashboardSidebar", () => {
  return function DummyDashboardSidebar() {
    return <div data-testid="dashboard-sidebar">Dashboard Sidebar</div>;
  };
});

jest.mock("../components/SalesSummary", () => {
  return function DummySalesSummary() {
    return <div data-testid="sales-summary">Sales Summary</div>;
  };
});

jest.mock("../components/DashboardOverview", () => {
  return function DummyDashboardOverview() {
    return <div data-testid="dashboard-overview">Dashboard Overview</div>;
  };
});

jest.mock("../components/ProductsSection", () => {
  return function DummyProductsSection() {
    return <div data-testid="products-section">Products Section</div>;
  };
});

jest.mock("../components/CustomersSection", () => {
  return function DummyCustomersSection() {
    return <div data-testid="customers-section">Customers Section</div>;
  };
});

jest.mock("../components/SalesSection", () => {
  return function DummySalesSection() {
    return <div data-testid="sales-section">Sales Section</div>;
  };
});

jest.mock("../components/Settings", () => {
  return function DummySettings() {
    return <div data-testid="settings-section">Settings Section</div>;
  };
});

// Mock del servicio API
jest.mock("../services/api", () => ({
  dashboardService: { getData: jest.fn() },
  authService: { login: jest.fn(), logout: jest.fn() }
}));

describe("Dashboard Tests", () => {
  const mockUser = { id: 1, name: "Test User", username: "test" };
  const mockOnLogout = jest.fn();
  const mockDashboardData = {
    dailySales: "$5,234",
    branchSales: [],
    salesTrend: [],
    productSales: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dashboardService.getData.mockResolvedValue(mockDashboardData);
  });

  const renderDashboard = (initialEntry = "/dashboard") =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Dashboard user={mockUser} onLogout={mockOnLogout} />
      </MemoryRouter>
    );

  describe("Rendering", () => {
    it("debe mostrar spinner de carga", () => {
      dashboardService.getData.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockDashboardData), 100))
      );
      renderDashboard();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("debe renderizar dashboard cuando carga exitosamente", async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
        expect(screen.getByTestId("dashboard-sidebar")).toBeInTheDocument();
      });
    });

    it("debe mostrar error cuando falla la carga", async () => {
      dashboardService.getData.mockRejectedValue(new Error("API Error"));
      
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/error cargando dashboard/i)).toBeInTheDocument();
      });
    });

    it("debe renderizar secciones al abrir rutas de nivel raíz", async () => {
      renderDashboard("/sales");

      await waitFor(() => {
        expect(screen.getByTestId("sales-section")).toBeInTheDocument();
      });
    });
  });
});
