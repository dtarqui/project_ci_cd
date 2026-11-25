import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { authService } from "../services/api";

jest.mock("../services/api", () => ({
  authService: { refresh: jest.fn() },
  setAccessToken: jest.fn(),
}));

describe("sesion al abrir la aplicacion", () => {
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
  let store;

  beforeEach(() => {
    // setupTests.js reemplaza localStorage por funciones vacias.
    store = {
      user: JSON.stringify({ id: 5, username: "vendedor" }),
    };
    localStorage.getItem.mockImplementation((key) => (key in store ? store[key] : null));
    localStorage.setItem.mockImplementation((key, value) => {
      store[key] = String(value);
    });
    localStorage.removeItem.mockImplementation((key) => {
      delete store[key];
    });
  });

  it("sin conexion conserva el usuario guardado para trabajar sin red", async () => {
    authService.refresh.mockRejectedValue({ code: "ERR_NETWORK", message: "Network Error" });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual({ id: 5, username: "vendedor" });
    expect(store.user).toBeDefined();
  });

  it("si el servidor rechaza la renovacion, cierra la sesion", async () => {
    authService.refresh.mockRejectedValue({ response: { status: 401 } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(store.user).toBeUndefined();
  });

  it("sin conexion y sin usuario guardado valido, no inventa una sesion", async () => {
    store.user = "{no es json";
    authService.refresh.mockRejectedValue({ code: "ERR_NETWORK" });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(store.user).toBeUndefined();
  });
});
