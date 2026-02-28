import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

// Mock de Login component
jest.mock("../login", () => {
  return function MockLogin({ onLogin }) {
    return (
      <div data-testid="login-component">
        <input data-testid="username-input" placeholder="Username" />
        <input data-testid="password-input" placeholder="Password" type="password" />
        <button 
          data-testid="login-button"
          onClick={() => onLogin({ id: 1, name: "Test User" }, "test-token")}
        >
          Login
        </button>
      </div>
    );
  };
});

// Mock de Dashboard component
jest.mock("../dashboard", () => {
  return function MockDashboard({ user, onLogout }) {
    return (
      <div data-testid="dashboard-component">
        <div data-testid="user-name">Welcome {user?.name}</div>
        <button data-testid="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    );
  };
});

describe("Pruebas de App", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    
    // Setup localStorage mocks
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  describe("Renderizado inicial", () => {
    test("debe renderizar login cuando no hay usuario guardado", async () => {
      localStorage.getItem.mockReturnValue(null);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("dashboard-component")).not.toBeInTheDocument();
    });

    test("debe renderizar dashboard cuando hay un usuario válido guardado", async () => {
      const mockUser = { id: 1, name: "Test User" };
      localStorage.getItem.mockImplementation((key) => {
        if (key === "user") return JSON.stringify(mockUser);
        if (key === "token") return "valid-token";
        return null;
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
        expect(screen.getByTestId("user-name")).toHaveTextContent("Welcome Test User");
      });

      expect(screen.queryByTestId("login-component")).not.toBeInTheDocument();
    });
  });

  describe("Flujo de autenticación", () => {
    test("debe manejar login exitoso", async () => {
      localStorage.getItem.mockReturnValue(null);
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      const loginButton = screen.getByTestId("login-button");
      await act(async () => {
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
        expect(localStorage.setItem).toHaveBeenCalledWith("user", JSON.stringify({ id: 1, name: "Test User" }));
        expect(localStorage.setItem).toHaveBeenCalledWith("token", "test-token");
      });
    });

    test("debe manejar logout", async () => {
      const mockUser = { id: 1, name: "Test User" };
      localStorage.getItem.mockImplementation((key) => {
        if (key === "user") return JSON.stringify(mockUser);
        if (key === "token") return "valid-token";
        return null;
      });

      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });

      const logoutButton = screen.getByTestId("logout-button");
      await act(async () => {
        await user.click(logoutButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
        expect(localStorage.removeItem).toHaveBeenCalledWith("user");
        expect(localStorage.removeItem).toHaveBeenCalledWith("token");
      });
    });
  });

  describe("Manejo de errores", () => {
    test("debe manejar datos corruptos en localStorage", async () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === "user") return "invalid-json";
        if (key === "token") return "token";
        return null;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
        expect(consoleSpy).toHaveBeenCalledWith("Error parsing user data:", expect.any(SyntaxError));
      });

      consoleSpy.mockRestore();
    });

    test("debe manejar ausencia de usuario cuando existe token", async () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === "user") return null;
        if (key === "token") return "orphaned-token";
        return null;
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });
    });

    test("debe manejar ausencia de token cuando existe usuario", async () => {
      const mockUser = { id: 1, name: "Test User" };
      localStorage.getItem.mockImplementation((key) => {
        if (key === "user") return JSON.stringify(mockUser);
        if (key === "token") return null;
        return null;
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });
    });

    test("debe manejar objeto de usuario inválido", async () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === "user") return JSON.stringify({ name: "Test User" }); // Missing ID
        if (key === "token") return "valid-token";
        return null;
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
        expect(localStorage.removeItem).toHaveBeenCalledWith("user");
        expect(localStorage.removeItem).toHaveBeenCalledWith("token");
      });
    });
  });

  describe("Gestión de estado", () => {
    test("debe actualizar el estado del usuario después del login", async () => {
      localStorage.getItem.mockReturnValue(null);
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      const loginButton = screen.getByTestId("login-button");
      await act(async () => {
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("user-name")).toHaveTextContent("Welcome Test User");
      });
    });

    test("debe limpiar el estado del usuario después del logout", async () => {
      const mockUser = { id: 1, name: "Test User" };
      localStorage.getItem.mockImplementation((key) => {
        if (key === "user") return JSON.stringify(mockUser);
        if (key === "token") return "valid-token";
        return null;
      });

      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });

      const logoutButton = screen.getByTestId("logout-button");
      await act(async () => {
        await user.click(logoutButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("dashboard-component")).not.toBeInTheDocument();
    });
  });

  describe("Integración con localStorage", () => {
    test("debe guardar datos de usuario en localStorage al hacer login", async () => {
      localStorage.getItem.mockReturnValue(null);
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      const loginButton = screen.getByTestId("login-button");
      await act(async () => {
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          "user", 
          JSON.stringify({ id: 1, name: "Test User" })
        );
        expect(localStorage.setItem).toHaveBeenCalledWith("token", "test-token");
      });
    });

    test("debe eliminar datos de usuario de localStorage al hacer logout", async () => {
      const mockUser = { id: 1, name: "Test User" };
      localStorage.getItem.mockImplementation((key) => {
        if (key === "user") return JSON.stringify(mockUser);
        if (key === "token") return "valid-token";
        return null;
      });

      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      });

      const logoutButton = screen.getByTestId("logout-button");
      await act(async () => {
        await user.click(logoutButton);
      });

      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith("user");
        expect(localStorage.removeItem).toHaveBeenCalledWith("token");
      });
    });

    test("debe manejar errores cuando localStorage.getItem falla", async () => {
      localStorage.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
        expect(consoleSpy).toHaveBeenCalledWith("Error parsing user data:", expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Interacciones de componentes", () => {
    test("debe pasar props correctas al componente Login", async () => {
      localStorage.getItem.mockReturnValue(null);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
        expect(screen.getByTestId("username-input")).toBeInTheDocument();
        expect(screen.getByTestId("password-input")).toBeInTheDocument();
        expect(screen.getByTestId("login-button")).toBeInTheDocument();
      });
    });

    test("debe pasar props correctas al componente Dashboard", async () => {
      const mockUser = { id: 1, name: "Test User" };
      localStorage.getItem.mockImplementation((key) => {
        if (key === "user") return JSON.stringify(mockUser);
        if (key === "token") return "valid-token";
        return null;
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
        expect(screen.getByTestId("user-name")).toHaveTextContent("Welcome Test User");
        expect(screen.getByTestId("logout-button")).toBeInTheDocument();
      });
    });
  });
});