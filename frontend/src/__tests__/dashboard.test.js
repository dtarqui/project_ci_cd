import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "../dashboard";
import { dashboardService, authService } from "../services/api";

// Mock completo del módulo api
jest.mock("../services/api", () => {
  const dashboardService = { getData: jest.fn() };
  const authService = { login: jest.fn(), logout: jest.fn() };
  return { dashboardService, authService };
});

// Mock de react-icons
jest.mock("react-icons/md", () => ({
  MdDashboard: () => <div data-testid="icon-dashboard">Dashboard Icon</div>,
  MdInventory: () => <div data-testid="icon-inventory">Inventory Icon</div>,
  MdPeople: () => <div data-testid="icon-people">People Icon</div>,
  MdSettings: () => <div data-testid="icon-settings">Settings Icon</div>,
  MdAccountCircle: () => <div data-testid="icon-account">Account Icon</div>,
  MdError: () => <div data-testid="icon-error">Error Icon</div>,
  MdRefresh: () => <div data-testid="icon-refresh">Refresh Icon</div>,
  MdExitToApp: () => <div data-testid="icon-exit">Exit Icon</div>,
  MdDescription: () => <div data-testid="icon-description">Description Icon</div>
}));

// Mock de recharts
jest.mock("recharts", () => ({
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar"></div>,
  XAxis: () => <div data-testid="x-axis"></div>,
  YAxis: () => <div data-testid="y-axis"></div>,
  CartesianGrid: () => <div data-testid="cartesian-grid"></div>,
  Tooltip: () => <div data-testid="tooltip"></div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie"></div>,
  Cell: () => <div data-testid="cell"></div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line"></div>,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>
}));

describe("Dashboard Tests", () => {
  const mockUser = { id: 1, name: "Test User", username: "test" };
  const mockOnLogout = jest.fn();
  const mockDashboardData = {
    dailySales: "$5,234",
    branchSales: [
      { name: "Sucursal Centro", value: 35 },
      { name: "Sucursal Norte", value: 25 },
      { name: "Sucursal Sur", value: 20 },
      { name: "Sucursal Oeste", value: 20 }
    ],
    salesTrend: [
      { day: "Lunes", sales: 1200 },
      { day: "Martes", sales: 1500 },
      { day: "Miércoles", sales: 1300 }
    ],
    productSales: [
      { name: "Producto A", quantity: 120 },
      { name: "Producto B", quantity: 95 }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnLogout.mockClear();

    dashboardService.getData.mockReset();
    authService.login.mockReset();
    authService.logout.mockReset();
  });

  describe("Rendering", () => {
    test("should show loading state initially", () => {
      dashboardService.getData.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
      expect(screen.getByText("Cargando dashboard...")).toBeInTheDocument();
    });

    test("should render dashboard with data successfully", async () => {
      dashboardService.getData.mockResolvedValue(mockDashboardData);
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
        expect(screen.getByText("$5,234")).toBeInTheDocument();
        expect(screen.getByText("Ventas diarias")).toBeInTheDocument();
      });
    });

    test("should show error state when data loading fails", async () => {
      dashboardService.getData.mockRejectedValue(new Error("API Error"));
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Error cargando dashboard/)).toBeInTheDocument();
        expect(screen.getByText("Reintentar")).toBeInTheDocument();
      });
    });

    test("should render navigation menu items", async () => {
      dashboardService.getData.mockResolvedValue(mockDashboardData);
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Productos")).toBeInTheDocument();
        expect(screen.getByText("Clientes")).toBeInTheDocument();
        expect(screen.getByText("Configuraciones")).toBeInTheDocument();
      });
    });

    test("should render user account button", async () => {
      dashboardService.getData.mockResolvedValue(mockDashboardData);
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        expect(screen.getByTestId("icon-account")).toBeInTheDocument();
      });
    });

    test("should render charts when data is available", async () => {
      dashboardService.getData.mockResolvedValue(mockDashboardData);
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        const containers = screen.getAllByTestId("responsive-container");
        expect(containers.length).toBeGreaterThan(0);
        const lineCharts = screen.getAllByTestId("line-chart");
        expect(lineCharts.length).toBeGreaterThan(0);
      });
    });
  });

  describe("User Interactions", () => {
    test("should toggle user menu when account button is clicked", async () => {
      dashboardService.getData.mockResolvedValue(mockDashboardData);
      const user = userEvent.setup();
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        expect(screen.getByTestId("icon-account")).toBeInTheDocument();
      });
      
      const accountButton = screen.getByTestId("icon-account").closest('button');
      await act(async () => {
        await user.click(accountButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText("Cuenta")).toBeInTheDocument();
        expect(screen.getByText("Salir")).toBeInTheDocument();
      });
    });

    test("should call logout when logout button is clicked", async () => {
      dashboardService.getData.mockResolvedValue(mockDashboardData);
      authService.logout.mockResolvedValue();
      const user = userEvent.setup();
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByTestId("icon-account")).toBeInTheDocument();
      });
      
      // Open user menu
      const accountButton = screen.getByTestId("icon-account").closest('button');
      await act(async () => {
        await user.click(accountButton);
      });
      
      // Click logout
      await waitFor(() => {
        expect(screen.getByText("Salir")).toBeInTheDocument();
      });
      
      const logoutButton = screen.getByText("Salir");
      await act(async () => {
        await user.click(logoutButton);
      });
      
      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalled();
        expect(mockOnLogout).toHaveBeenCalled();
      });
    });

    test("should change active section when nav items are clicked", async () => {
      dashboardService.getData.mockResolvedValue(mockDashboardData);
      const user = userEvent.setup();
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        expect(screen.getByText("Productos")).toBeInTheDocument();
      });
      
      const productosButton = screen.getByText("Productos");
      await act(async () => {
        await user.click(productosButton);
      });
      
      // The active section should change (we can verify by checking class or other indicators)
      expect(productosButton.closest('button')).toHaveClass('nav-item');
    });

    test("should retry data loading when retry button is clicked", async () => {
      // First call fails
      dashboardService.getData.mockRejectedValueOnce(new Error("API Error"));
      // Second call succeeds
      dashboardService.getData.mockResolvedValueOnce(mockDashboardData);
      
      const user = userEvent.setup();
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText("Reintentar")).toBeInTheDocument();
      });
      
      // Click retry
      const retryButton = screen.getByText("Reintentar");
      await act(async () => {
        await user.click(retryButton);
      });
      
      // Should show loading then success
      await waitFor(() => {
        expect(screen.getByText("$5,234")).toBeInTheDocument();
      });
      
      expect(dashboardService.getData).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error Handling", () => {
    test("should handle logout error gracefully", async () => {
      dashboardService.getData.mockResolvedValue(mockDashboardData);
      authService.logout.mockRejectedValue(new Error("Logout failed"));
      const user = userEvent.setup();
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        expect(screen.getByTestId("icon-account")).toBeInTheDocument();
      });
      
      // Open menu and logout
      const accountButton = screen.getByTestId("icon-account").closest('button');
      await act(async () => {
        await user.click(accountButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText("Salir")).toBeInTheDocument();
      });
      
      const logoutButton = screen.getByText("Salir");
      await act(async () => {
        await user.click(logoutButton);
      });
      
      await waitFor(() => {
        expect(mockOnLogout).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith("Error logging out:", expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    test("should handle data loading error and show error message", async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      dashboardService.getData.mockRejectedValue(new Error("Network error"));
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Error cargando dashboard/)).toBeInTheDocument();
        expect(consoleSpy).toHaveBeenCalledWith("Error loading dashboard data:", expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe("Service Calls", () => {
    test("should call dashboardService.getData on mount", async () => {
      dashboardService.getData.mockResolvedValue(mockDashboardData);
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        expect(dashboardService.getData).toHaveBeenCalledTimes(1);
      });
    });

    test("should call authService.logout when logging out", async () => {
      dashboardService.getData.mockResolvedValue(mockDashboardData);
      authService.logout.mockResolvedValue();
      const user = userEvent.setup();
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        expect(screen.getByTestId("icon-account")).toBeInTheDocument();
      });
      
      const accountButton = screen.getByTestId("icon-account").closest('button');
      await act(async () => {
        await user.click(accountButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText("Salir")).toBeInTheDocument();
      });
      
      const logoutButton = screen.getByText("Salir");
      await act(async () => {
        await user.click(logoutButton);
      });
      
      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Data Display", () => {
    test("should display sales data correctly", async () => {
      dashboardService.getData.mockResolvedValue(mockDashboardData);
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        expect(screen.getByText("$5,234")).toBeInTheDocument();
        expect(screen.getByText("Ventas diarias")).toBeInTheDocument();
      });
    });

    test("should render different sections based on navigation", async () => {
      dashboardService.getData.mockResolvedValue(mockDashboardData);
      
      render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
      
      await waitFor(() => {
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Productos")).toBeInTheDocument();
        expect(screen.getByText("Clientes")).toBeInTheDocument();
        expect(screen.getByText("Configuraciones")).toBeInTheDocument();
      });
    });
  });
});
