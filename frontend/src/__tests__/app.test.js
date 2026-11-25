import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { authService, setAccessToken } from "../services/api";

jest.mock("../services/api", () => ({
  authService: {
    refresh: jest.fn(),
  },
  setAccessToken: jest.fn(),
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

  test("debe renderizar login cuando no hay sesión que renovar", async () => {
    authService.refresh.mockRejectedValue({ response: { status: 401 } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("login-component")).toBeInTheDocument();
    });

    expect(authService.refresh).toHaveBeenCalledTimes(1);
  });

  test("debe renderizar dashboard cuando la renovación devuelve un usuario válido", async () => {
    authService.refresh.mockResolvedValue({
      user: { id: 1, name: "Test User", username: "test" },
      token: "token-renovado",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
      expect(screen.getByTestId("user-name")).toHaveTextContent("Welcome Test User");
    });

    expect(authService.refresh).toHaveBeenCalledTimes(1);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "user",
      JSON.stringify({ id: 1, name: "Test User", username: "test" })
    );
  });

  test("debe volver a login cuando la renovación falla y limpiar sesión", async () => {
    authService.refresh.mockRejectedValue(new Error("Token inválido"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("login-component")).toBeInTheDocument();
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith("user");
  });

  test("debe manejar login exitoso", async () => {
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
    expect(setAccessToken).toHaveBeenCalledWith("test-token");
    expect(localStorage.setItem).not.toHaveBeenCalledWith("token", expect.anything());
  });

  test("debe manejar logout", async () => {
    authService.refresh.mockResolvedValue({
      user: { id: 1, name: "Test User", username: "test" },
      token: "token-renovado",
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
  });

  test("debe limpiar usuario al recibir evento unauthorized", async () => {
    authService.refresh.mockResolvedValue({
      user: { id: 1, name: "Test User", username: "test" },
      token: "token-renovado",
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
