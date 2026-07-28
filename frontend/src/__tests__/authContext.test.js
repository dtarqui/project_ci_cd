import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { authService } from "../services/api";

jest.mock("../services/api", () => ({
  authService: {
    getMe: jest.fn(),
  },
}));

function Harness() {
  const { user, loading, login, logout } = useAuth();

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div data-testid="user-name">{user ? user.name : "sin sesión"}</div>
      <button onClick={() => login({ id: 1, name: "Nueva Sesión" }, "token-123")}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

const renderWithProvider = () =>
  render(
    <AuthProvider>
      <Harness />
    </AuthProvider>
  );

let store;

const useFakeLocalStorage = () => {
  store = {};
  localStorage.getItem.mockImplementation((key) => (key in store ? store[key] : null));
  localStorage.setItem.mockImplementation((key, value) => {
    store[key] = value;
  });
  localStorage.removeItem.mockImplementation((key) => {
    delete store[key];
  });
};

describe("AuthContext / useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFakeLocalStorage();
  });

  it("debe iniciar sin usuario cuando no hay token guardado", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    });
    expect(authService.getMe).not.toHaveBeenCalled();
  });

  it("debe hidratar la sesión cuando hay un token válido", async () => {
    store.token = "valid-token";
    authService.getMe.mockResolvedValue({
      user: { id: 5, name: "Usuario Guardado" },
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Usuario Guardado");
    });
    expect(store.user).toContain("Usuario Guardado");
  });

  it("debe limpiar la sesión cuando getMe falla", async () => {
    store.token = "expired-token";
    authService.getMe.mockRejectedValue(new Error("Token inválido"));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    });
    expect(store.token).toBeUndefined();
  });

  it("debe iniciar sesión y guardar en localStorage", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    });

    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByTestId("user-name")).toHaveTextContent("Nueva Sesión");
    expect(store.token).toBe("token-123");
  });

  it("debe cerrar sesión y limpiar localStorage", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    });

    await userEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getByTestId("user-name")).toHaveTextContent("Nueva Sesión");

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    expect(store.token).toBeUndefined();
    expect(store.user).toBeUndefined();
  });

  it("debe limpiar el usuario cuando se recibe el evento unauthorized", async () => {
    store.token = "valid-token";
    authService.getMe.mockResolvedValue({
      user: { id: 5, name: "Usuario Guardado" },
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Usuario Guardado");
    });

    window.dispatchEvent(new Event("unauthorized"));

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    });
  });

  it("debe actualizar el usuario cuando se recibe el evento user-updated", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    });

    window.dispatchEvent(
      new CustomEvent("user-updated", { detail: { id: 9, name: "Nombre Actualizado" } })
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Nombre Actualizado");
    });
  });

  it("debe ignorar el evento user-updated cuando no trae un id válido", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    });

    window.dispatchEvent(new CustomEvent("user-updated", { detail: {} }));

    expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
  });

  it("debe lanzar un error cuando useAuth se usa fuera de AuthProvider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Harness />)).toThrow(
      "useAuth debe usarse dentro de un AuthProvider"
    );

    consoleSpy.mockRestore();
  });
});
