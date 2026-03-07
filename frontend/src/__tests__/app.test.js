import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { authService } from "../services/api";

jest.mock("../services/api", () => ({
  authService: {
    getMe: jest.fn(),
  },
}));

jest.mock("../login", () => {
  return function MockLogin({ onLogin }) {
    return (
      <div data-testid="login-component">
        <button
          data-testid="login-button"
          onClick={() =>
            onLogin({ id: 1, name: "Test User", username: "test" }, "test-token")
          }
        >
          Login
        </button>
      </div>
    );
  };
});

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
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("debe renderizar login cuando no hay token guardado", async () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === "token") return null;
      return null;
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("login-component")).toBeInTheDocument();
    });

    expect(authService.getMe).not.toHaveBeenCalled();
  });

  test("debe renderizar dashboard cuando getMe retorna usuario válido", async () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === "token") return "valid-token";
      return null;
    });

    authService.getMe.mockResolvedValue({
      user: { id: 1, name: "Test User", username: "test" },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      expect(screen.getByTestId("user-name")).toHaveTextContent("Welcome Test User");
    });

    expect(authService.getMe).toHaveBeenCalledTimes(1);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "user",
      JSON.stringify({ id: 1, name: "Test User", username: "test" })
    );
  });

  test("debe volver a login cuando getMe falla y limpiar sesión", async () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === "token") return "expired-token";
      return null;
    });

    authService.getMe.mockRejectedValue(new Error("Token inválido"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("login-component")).toBeInTheDocument();
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith("user");
    expect(localStorage.removeItem).toHaveBeenCalledWith("token");
  });

  test("debe manejar login exitoso", async () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === "token") return null;
      return null;
    });

    const user = userEvent.setup();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("login-component")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("login-button"));

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "user",
      JSON.stringify({ id: 1, name: "Test User", username: "test" })
    );
    expect(localStorage.setItem).toHaveBeenCalledWith("token", "test-token");
  });

  test("debe manejar logout", async () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === "token") return "valid-token";
      return null;
    });

    authService.getMe.mockResolvedValue({
      user: { id: 1, name: "Test User", username: "test" },
    });

    const user = userEvent.setup();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("logout-button"));

    await waitFor(() => {
      expect(screen.getByTestId("login-component")).toBeInTheDocument();
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith("user");
    expect(localStorage.removeItem).toHaveBeenCalledWith("token");
  });

  test("debe limpiar usuario al recibir evento unauthorized", async () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === "token") return "valid-token";
      return null;
    });

    authService.getMe.mockResolvedValue({
      user: { id: 1, name: "Test User", username: "test" },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
    });

    window.dispatchEvent(new Event("unauthorized"));

    await waitFor(() => {
      expect(screen.getByTestId("login-component")).toBeInTheDocument();
    });
  });
});
