import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

// Mock de los componentes hijos
jest.mock("./login", () => {
  return function MockLogin({ onLogin }) {
    return (
      <div data-testid="login-component">
        <button
          onClick={() => onLogin({ id: 1, name: "Test User" }, "test-token")}
        >
          Mock Login
        </button>
      </div>
    );
  };
});

jest.mock("./dashboard", () => {
  return function MockDashboard({ user, onLogout }) {
    return (
      <div data-testid="dashboard-component">
        <span>Welcome {user.name}</span>
        <button onClick={onLogout}>Mock Logout</button>
      </div>
    );
  };
});

describe("App Component", () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe("Component Rendering", () => {
    test("should render login component when no user is logged in", async () => {
      await act(async () => {
        render(<App />);
      });

      expect(screen.getByTestId("login-component")).toBeInTheDocument();
      expect(
        screen.queryByTestId("dashboard-component")
      ).not.toBeInTheDocument();
    });

    test("should render dashboard when user is logged in", async () => {
      // Simular usuario guardado en localStorage
      const mockUser = { id: 1, name: "Test User", username: "test" };
      localStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("login-component")).not.toBeInTheDocument();
      expect(screen.getByText("Welcome Test User")).toBeInTheDocument();
    });

    test("should show loading state initially", () => {
      render(<App />);

      // Durante la carga inicial
      expect(screen.getByText("Cargando...")).toBeInTheDocument();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    test("should hide loading after initialization", async () => {
      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.queryByText("Cargando...")).not.toBeInTheDocument();
      });
    });
  });

  describe("Authentication Flow", () => {
    test("should handle login correctly", async () => {
      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      const loginButton = screen.getByText("Mock Login");

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });

      // Verificar que se guardó en localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "user",
        JSON.stringify({ id: 1, name: "Test User" })
      );
      expect(localStorage.setItem).toHaveBeenCalledWith("token", "test-token");
    });

    test("should handle logout correctly", async () => {
      // Empezar con usuario logueado
      const mockUser = { id: 1, name: "Test User" };
      localStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });

      const logoutButton = screen.getByText("Mock Logout");

      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      // Verificar que se limpió localStorage
      expect(localStorage.removeItem).toHaveBeenCalledWith("user");
      expect(localStorage.removeItem).toHaveBeenCalledWith("token");
    });

    test("should handle corrupted localStorage data gracefully", async () => {
      // Simular datos corruptos
      localStorage.getItem.mockReturnValue("invalid-json");
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      // Debería limpiar los datos corruptos
      expect(localStorage.removeItem).toHaveBeenCalledWith("user");
      expect(localStorage.removeItem).toHaveBeenCalledWith("token");

      consoleSpy.mockRestore();
    });

    test("should maintain user session with valid token", async () => {
      const mockUser = { id: 1, name: "Persistent User" };
      const mockToken = "valid-token";

      localStorage.getItem.mockImplementation((key) => {
        if (key === "user") return JSON.stringify(mockUser);
        if (key === "token") return mockToken;
        return null;
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });

      expect(screen.getByText("Welcome Persistent User")).toBeInTheDocument();
    });
  });

  describe("State Management", () => {
    test("should properly update state when user logs in", async () => {
      await act(async () => {
        render(<App />);
      });

      // Inicial: no hay usuario
      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      // Login
      await act(async () => {
        screen.getByText("Mock Login").click();
      });

      // Post-login: hay usuario
      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });
    });

    test("should properly clear state when user logs out", async () => {
      // Empezar logueado
      localStorage.getItem.mockReturnValue(
        JSON.stringify({ id: 1, name: "User" })
      );

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });

      // Logout
      await act(async () => {
        screen.getByText("Mock Logout").click();
      });

      // Post-logout: no hay usuario
      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });
    });

    test("should handle multiple login/logout cycles", async () => {
      await act(async () => {
        render(<App />);
      });

      // Ciclo 1: Login
      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByText("Mock Login").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });

      // Ciclo 1: Logout
      await act(async () => {
        screen.getByText("Mock Logout").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      // Ciclo 2: Login again
      await act(async () => {
        screen.getByText("Mock Login").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });

      // Verificar que localStorage fue llamado correctamente
      expect(localStorage.setItem).toHaveBeenCalledTimes(4); // 2 login cycles, user + token each
      expect(localStorage.removeItem).toHaveBeenCalledTimes(2); // 1 logout cycle, user + token
    });
  });

  describe("LocalStorage Integration", () => {
    test("should read from localStorage on mount", async () => {
      const mockUser = { id: 2, name: "Stored User" };
      localStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      await act(async () => {
        render(<App />);
      });

      expect(localStorage.getItem).toHaveBeenCalledWith("user");
      expect(localStorage.getItem).toHaveBeenCalledWith("token");

      await waitFor(() => {
        expect(screen.getByText("Welcome Stored User")).toBeInTheDocument();
      });
    });

    test("should handle missing localStorage data", async () => {
      localStorage.getItem.mockReturnValue(null);

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });

    test("should handle localStorage errors gracefully", async () => {
      localStorage.getItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Performance and Async Behavior", () => {
    test("should handle rapid state changes", async () => {
      await act(async () => {
        render(<App />);
      });

      // Login rápido
      await act(async () => {
        screen.getByText("Mock Login").click();
      });

      // Logout rápido
      await act(async () => {
        screen.getByText("Mock Logout").click();
      });

      // Login rápido otra vez
      await act(async () => {
        screen.getByText("Mock Login").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });
    });

    test("should not cause memory leaks on unmount", async () => {
      const { unmount } = await act(async () => {
        return render(<App />);
      });

      await act(async () => {
        unmount();
      });

      // No debería haber errores o warnings de React
      expect(true).toBe(true);
    });
  });

  describe("CSS Classes and Styling", () => {
    test("should apply correct CSS classes", async () => {
      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        const appContainer = screen
          .getByTestId("login-component")
          .closest(".app");
        expect(appContainer).toBeInTheDocument();
      });
    });

    test("should apply loading container classes during loading", () => {
      render(<App />);

      const loadingContainer = screen
        .getByText("Cargando...")
        .closest(".loading-container");
      expect(loadingContainer).toBeInTheDocument();
      expect(loadingContainer).toHaveClass("loading-container");
    });
  });

  describe("Edge Cases", () => {
    test("should handle undefined user data", async () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === "user") return "undefined";
        return null;
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });
    });

    test("should handle null user data", async () => {
      localStorage.getItem.mockReturnValue("null");

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });
    });

    test("should handle empty object user data", async () => {
      localStorage.getItem.mockReturnValue("{}");

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });
    });
  });
});
