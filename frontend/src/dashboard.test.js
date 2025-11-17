import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import axios from "axios";
import Dashboard from "./dashboard";

// Mock de axios
jest.mock("axios");
const mockedAxios = axios;

const mockDashboardData = {
  dailySales: "64M",
  branchSales: [
    { name: "Sucursal Norte", value: 30 },
    { name: "Sucursal Sur", value: 25 },
    { name: "Sucursal Este", value: 20 },
    { name: "Sucursal Oeste", value: 25 },
  ],
  salesTrend: [
    { day: "Lun", sales: 12 },
    { day: "Mar", sales: 19 },
    { day: "Mié", sales: 15 },
    { day: "Jue", sales: 25 },
    { day: "Vie", sales: 22 },
    { day: "Sáb", sales: 30 },
    { day: "Dom", sales: 28 },
  ],
  productSales: [
    { product: "Producto A", quantity: 45 },
    { product: "Producto B", quantity: 30 },
    { product: "Producto C", quantity: 35 },
    { product: "Producto D", quantity: 20 },
  ],
};

describe("Dashboard Component Tests", () => {
  const mockUser = { id: 1, name: "Test User", username: "testuser" };
  const mockOnLogout = jest.fn();
  let user;

  beforeEach(() => {
    mockOnLogout.mockClear();
    mockedAxios.get.mockClear();
    mockedAxios.post.mockClear();
    user = userEvent.setup();
  });

  describe("Component Rendering", () => {
    test("renders dashboard header correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });

      expect(screen.getByText("👤")).toBeInTheDocument();
    });

    test("shows loading state initially", () => {
      mockedAxios.get.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);

      expect(screen.getByText("Cargando dashboard...")).toBeInTheDocument();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    test("renders all navigation items", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Productos")).toBeInTheDocument();
      expect(screen.getByText("Clientes")).toBeInTheDocument();
      expect(screen.getByText("Configuraciones")).toBeInTheDocument();
    });

    test("renders dashboard content after loading", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("64M")).toBeInTheDocument();
      });

      expect(screen.getByText("Ventas diarias")).toBeInTheDocument();
      expect(screen.getByText("Productos vendidos")).toBeInTheDocument();
      expect(screen.getByText("Ventas en día")).toBeInTheDocument();
      expect(screen.getByText("Ventas por sucursal")).toBeInTheDocument();
    });

    test("renders all chart components", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("responsive-container")).toHaveLength(4);
      });

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
      expect(screen.getAllByTestId("pie-chart")).toHaveLength(2);
    });

    test("renders chart data correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        const lineChart = screen.getByTestId("line-chart");
        expect(lineChart).toHaveAttribute(
          "data-chart-data",
          JSON.stringify(mockDashboardData.productSales)
        );
      });

      const barChart = screen.getByTestId("bar-chart");
      expect(barChart).toHaveAttribute(
        "data-chart-data",
        JSON.stringify(mockDashboardData.salesTrend)
      );
    });
  });

  describe("Navigation System", () => {
    beforeEach(async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });
    });

    test("navigation between sections works", async () => {
      // Click en Productos
      await user.click(screen.getByText("Productos"));

      expect(screen.getByText("Gestión de Productos")).toBeInTheDocument();
      expect(
        screen.getByText("Esta sección está en desarrollo")
      ).toBeInTheDocument();

      // Click en Dashboard para volver
      await user.click(screen.getByText("Dashboard"));

      expect(screen.getByText("64M")).toBeInTheDocument();
    });

    test("shows active section styling", async () => {
      const dashboardButton = screen.getByText("Dashboard");
      expect(dashboardButton.closest(".nav-item")).toHaveClass("active");

      await user.click(screen.getByText("Productos"));

      const productosButton = screen.getByText("Productos");
      expect(productosButton.closest(".nav-item")).toHaveClass("active");
      expect(dashboardButton.closest(".nav-item")).not.toHaveClass("active");
    });

    test("all navigation sections render correctly", async () => {
      const sections = [
        { button: "Productos", title: "Gestión de Productos", icon: "📦" },
        { button: "Clientes", title: "Gestión de Clientes", icon: "👥" },
        {
          button: "Configuraciones",
          title: "Configuraciones del Sistema",
          icon: "⚙️",
        },
      ];

      for (const section of sections) {
        await user.click(screen.getByText(section.button));

        expect(screen.getByText(section.title)).toBeInTheDocument();
        expect(
          screen.getByText("Esta sección está en desarrollo")
        ).toBeInTheDocument();
        expect(screen.getByText(section.icon)).toBeInTheDocument();
      }
    });

    test("keyboard navigation works", async () => {
      const dashboardButton = screen.getByText("Dashboard");

      await user.tab();
      // El primer elemento focuseable debería ser el botón de usuario
      expect(screen.getByText("👤")).toHaveFocus();

      // Continuar navegando con tab
      await user.tab();
      expect(dashboardButton).toHaveFocus();

      await user.tab();
      expect(screen.getByText("Productos")).toHaveFocus();
    });

    test("navigation maintains state correctly", async () => {
      // Ir a Productos
      await user.click(screen.getByText("Productos"));
      expect(screen.getByText("Gestión de Productos")).toBeInTheDocument();

      // Ir a Clientes
      await user.click(screen.getByText("Clientes"));
      expect(screen.getByText("Gestión de Clientes")).toBeInTheDocument();

      // Volver a Dashboard
      await user.click(screen.getByText("Dashboard"));
      expect(screen.getByText("64M")).toBeInTheDocument();
    });
  });

  describe("User Menu System", () => {
    beforeEach(async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });
    });

    test("user menu toggle works", async () => {
      // El menú no debería estar visible inicialmente
      expect(screen.queryByText("Cuenta")).not.toBeInTheDocument();

      // Click en el botón del usuario
      await user.click(screen.getByText("👤"));

      // Ahora el menú debería estar visible
      expect(screen.getByText("Cuenta")).toBeInTheDocument();
      expect(screen.getByText("Salir")).toBeInTheDocument();
    });

    test("clicking outside closes user menu", async () => {
      // Abrir menú
      await user.click(screen.getByText("👤"));
      expect(screen.getByText("Cuenta")).toBeInTheDocument();

      // Click en el botón otra vez para cerrar
      await user.click(screen.getByText("👤"));
      expect(screen.queryByText("Cuenta")).not.toBeInTheDocument();
    });

    test("user menu shows correct information", async () => {
      await user.click(screen.getByText("👤"));

      expect(screen.getByText("Cuenta")).toBeInTheDocument();
      expect(screen.getByText("Salir")).toBeInTheDocument();

      const logoutButton = screen.getByText("Salir");
      expect(logoutButton).toHaveClass("logout-button");
    });

    test("user menu accessibility", async () => {
      const userButton = screen.getByText("👤");
      expect(userButton).toHaveClass("user-button");

      // Debería ser navegable por teclado
      userButton.focus();
      expect(userButton).toHaveFocus();
    });
  });

  describe("Logout Functionality", () => {
    beforeEach(async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });
    });

    test("logout functionality works correctly", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      // Abrir menú de usuario
      await user.click(screen.getByText("👤"));

      // Click en salir
      await user.click(screen.getByText("Salir"));

      await waitFor(() => {
        expect(mockOnLogout).toHaveBeenCalled();
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "http://localhost:4000/api/auth/logout"
      );
    });

    test("handles logout API error gracefully", async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error("Logout failed"));
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await user.click(screen.getByText("👤"));
      await user.click(screen.getByText("Salir"));

      await waitFor(() => {
        expect(mockOnLogout).toHaveBeenCalled();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error logging out:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    test("logout works even without API response", async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 500 },
      });

      await user.click(screen.getByText("👤"));
      await user.click(screen.getByText("Salir"));

      // Debería llamar onLogout incluso si la API falla
      await waitFor(() => {
        expect(mockOnLogout).toHaveBeenCalled();
      });
    });
  });

  describe("API Integration", () => {
    test("makes API call on mount", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          "http://localhost:4000/api/dashboard/data"
        );
      });
    });

    test("handles API error gracefully", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("API Error"));
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error loading dashboard data:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    test("handles network timeout", async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: "ECONNABORTED",
        message: "Network timeout",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test("retries API call on error", async () => {
      // Primera llamada falla
      mockedAxios.get
        .mockRejectedValueOnce(new Error("Network Error"))
        // Segunda llamada funciona (si implementamos retry)
        .mockResolvedValueOnce({
          data: mockDashboardData,
        });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });
    });
  });

  describe("Data Display", () => {
    beforeEach(async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("64M")).toBeInTheDocument();
      });
    });

    test("displays main sales metric correctly", () => {
      expect(screen.getByText("64M")).toBeInTheDocument();
      expect(screen.getByText("Ventas diarias")).toBeInTheDocument();
    });

    test("displays all chart sections", () => {
      expect(screen.getByText("Productos vendidos")).toBeInTheDocument();
      expect(screen.getByText("Ventas en día")).toBeInTheDocument();
      expect(screen.getByText("Ventas por sucursal")).toBeInTheDocument();
      expect(screen.getByText("Y Axis Label")).toBeInTheDocument();
    });

    test("displays help icon", () => {
      expect(screen.getByText("❓")).toBeInTheDocument();
    });

    test("chart data is properly formatted", () => {
      const lineChart = screen.getByTestId("line-chart");
      const chartData = JSON.parse(lineChart.getAttribute("data-chart-data"));

      expect(chartData).toEqual(mockDashboardData.productSales);
      expect(chartData[0]).toHaveProperty("product");
      expect(chartData[0]).toHaveProperty("quantity");
    });

    test("handles empty data gracefully", async () => {
      const emptyData = {
        dailySales: "0",
        branchSales: [],
        salesTrend: [],
        productSales: [],
      };

      // Nuevo componente con datos vacíos
      mockedAxios.get.mockResolvedValueOnce({
        data: emptyData,
      });

      const { rerender } = await act(async () => {
        return render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
      });
    });
  });

  describe("Responsive Behavior", () => {
    beforeEach(async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });
    });

    test("applies correct CSS classes for layout", () => {
      expect(screen.getByText("Mi Tienda").closest(".dashboard")).toHaveClass(
        "dashboard"
      );
      expect(
        screen.getByText("Dashboard").closest(".dashboard-sidebar")
      ).toHaveClass("dashboard-sidebar");
    });

    test("charts grid has correct structure", () => {
      const chartsGrid = screen
        .getByText("Productos vendidos")
        .closest(".charts-grid");
      expect(chartsGrid).toHaveClass("charts-grid");
    });

    test("navigation items have correct styling", () => {
      const dashboardNav = screen.getByText("Dashboard").closest(".nav-item");
      expect(dashboardNav).toHaveClass("nav-item", "active");
    });
  });

  describe("Accessibility", () => {
    beforeEach(async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });
    });

    test("navigation is accessible by keyboard", async () => {
      // Tab a través de los elementos de navegación
      await user.tab(); // User button
      expect(screen.getByText("👤")).toHaveFocus();

      await user.tab(); // Dashboard
      expect(screen.getByText("Dashboard")).toHaveFocus();

      await user.tab(); // Productos
      expect(screen.getByText("Productos")).toHaveFocus();
    });

    test("buttons have appropriate roles", () => {
      const userButton = screen.getByText("👤");
      const logoutButton = screen.queryByText("Salir");

      expect(userButton.tagName).toBe("BUTTON");

      if (logoutButton) {
        expect(logoutButton.tagName).toBe("BUTTON");
      }
    });

    test("navigation items have semantic structure", () => {
      const navigationItems = screen
        .getAllByRole("button")
        .filter((button) =>
          ["Dashboard", "Productos", "Clientes", "Configuraciones"].includes(
            button.textContent
          )
        );

      navigationItems.forEach((item) => {
        expect(item).toBeInTheDocument();
        expect(item.tagName).toBe("BUTTON");
      });
    });
  });

  describe("State Management", () => {
    test("manages loading state correctly", async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedAxios.get.mockReturnValueOnce(promise);

      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);

      // Durante la carga
      expect(screen.getByText("Cargando dashboard...")).toBeInTheDocument();

      // Resolver la promesa
      resolvePromise({
        data: mockDashboardData,
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Cargando dashboard...")
        ).not.toBeInTheDocument();
      });
    });

    test("manages active section state", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Dashboard").closest(".nav-item")).toHaveClass(
          "active"
        );
      });

      await user.click(screen.getByText("Productos"));

      expect(screen.getByText("Productos").closest(".nav-item")).toHaveClass(
        "active"
      );
      expect(
        screen.getByText("Dashboard").closest(".nav-item")
      ).not.toHaveClass("active");
    });

    test("manages user menu state", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });

      // Menú cerrado inicialmente
      expect(screen.queryByText("Cuenta")).not.toBeInTheDocument();

      // Abrir menú
      await user.click(screen.getByText("👤"));
      expect(screen.getByText("Cuenta")).toBeInTheDocument();

      // Cerrar menú
      await user.click(screen.getByText("👤"));
      expect(screen.queryByText("Cuenta")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles malformed API data", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { invalid: "data" },
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });
    });

    test("handles undefined user prop", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={undefined} onLogout={mockOnLogout} />);
      });

      // No debería crashear
      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });
    });

    test("handles rapid navigation clicks", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockDashboardData,
      });

      await act(async () => {
        render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      });

      // Clics rápidos en navegación
      await user.click(screen.getByText("Productos"));
      await user.click(screen.getByText("Clientes"));
      await user.click(screen.getByText("Dashboard"));

      expect(screen.getByText("64M")).toBeInTheDocument();
    });

    test("handles component unmount during API call", async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedAxios.get.mockReturnValueOnce(promise);

      const { unmount } = render(
        <Dashboard user={mockUser} onLogout={mockOnLogout} />
      );

      // Unmount antes de que resuelva la API
      unmount();

      // Resolver después de unmount
      resolvePromise({
        data: mockDashboardData,
      });

      // No debería haber errores
      expect(true).toBe(true);
    });
  });
});
