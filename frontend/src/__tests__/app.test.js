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

describe("App Tests", () => {
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

  describe("Initial Rendering", () => {
    test("should render login when no user is stored", async () => {
      localStorage.getItem.mockReturnValue(null);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("dashboard-component")).not.toBeInTheDocument();
    });

    test("should render dashboard when valid user is stored", async () => {
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

  describe("Authentication Flow", () => {
    test("should handle successful login", async () => {
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

    test("should handle logout", async () => {
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

  describe("Error Handling", () => {
    test("should handle corrupted localStorage data", async () => {
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

    test("should handle missing user data with token present", async () => {
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

    test("should handle missing token with user present", async () => {
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

    test("should handle invalid user object", async () => {
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

  describe("State Management", () => {
    test("should update user state after login", async () => {
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

    test("should clear user state after logout", async () => {
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

  describe("localStorage Integration", () => {
    test("should save user data to localStorage on login", async () => {
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

    test("should remove user data from localStorage on logout", async () => {
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

    test("should handle localStorage.getItem throwing error", async () => {
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

  describe("Component Interactions", () => {
    test("should pass correct props to Login component", async () => {
      localStorage.getItem.mockReturnValue(null);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
        expect(screen.getByTestId("username-input")).toBeInTheDocument();
        expect(screen.getByTestId("password-input")).toBeInTheDocument();
        expect(screen.getByTestId("login-button")).toBeInTheDocument();
      });
    });

    test("should pass correct props to Dashboard component", async () => {
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