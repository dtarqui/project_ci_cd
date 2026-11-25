import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { authService, setAccessToken } from "../services/api";

jest.mock("../services/api", () => ({
  authService: {
    refresh: jest.fn(),
  },
  setAccessToken: jest.fn(),
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

const sinSesion = () => authService.refresh.mockRejectedValue({ response: { status: 401 } });

describe("AuthContext / useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFakeLocalStorage();
  });

  it("debe iniciar sin usuario cuando la cookie no permite renovar la sesión", async () => {
    sinSesion();
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    });
    expect(authService.refresh).toHaveBeenCalledTimes(1);
  });

  it("debe recuperar la sesión con la cookie de renovación al abrir la aplicación", async () => {
    authService.refresh.mockResolvedValue({
      user: { id: 5, name: "Usuario Guardado" },
      token: "token-renovado",
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Usuario Guardado");
    });
    expect(store.user).toContain("Usuario Guardado");
    expect(store.token).toBeUndefined();
  });

  it("debe descartar el token que guardaban las versiones anteriores", async () => {
    store.token = "token-viejo";
    sinSesion();

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    });
    expect(store.token).toBeUndefined();
  });

  it("debe limpiar el usuario guardado cuando la renovación responde sin usuario", async () => {
    store.user = JSON.stringify({ id: 5, name: "Usuario Guardado" });
    authService.refresh.mockResolvedValue({});

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    });
    expect(store.user).toBeUndefined();
  });

  it("debe iniciar sesión con el token en memoria y el perfil en localStorage", async () => {
    sinSesion();
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    });

    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByTestId("user-name")).toHaveTextContent("Nueva Sesión");
    expect(setAccessToken).toHaveBeenCalledWith("token-123");
    expect(store.user).toContain("Nueva Sesión");
    expect(store.token).toBeUndefined();
  });

  it("debe cerrar sesión y olvidar el token y el perfil", async () => {
    sinSesion();
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    });

    await userEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getByTestId("user-name")).toHaveTextContent("Nueva Sesión");

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(screen.getByTestId("user-name")).toHaveTextContent("sin sesión");
    expect(setAccessToken).toHaveBeenLastCalledWith(null);
    expect(store.user).toBeUndefined();
  });

  it("debe limpiar el usuario cuando se recibe el evento unauthorized", async () => {
    authService.refresh.mockResolvedValue({
      user: { id: 5, name: "Usuario Guardado" },
      token: "token-renovado",
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
    sinSesion();
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
    sinSesion();
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
