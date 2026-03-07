import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "../login";
import { authService } from "../services/api";

jest.mock("react-icons/md", () => ({
  MdVisibility: () => <div data-testid="icon-visibility">Show</div>,
  MdVisibilityOff: () => <div data-testid="icon-visibility-off">Hide</div>,
}));

jest.mock("../services/api", () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
  },
}));

describe("Pruebas de Login", () => {
  const mockOnLogin = jest.fn();

  const renderLogin = (mode = "login") =>
    render(
      <MemoryRouter>
        <Login onLogin={mockOnLogin} mode={mode} />
      </MemoryRouter>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Renderizado", () => {
    test("debe renderizar el formulario de login", () => {
      renderLogin();

      expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      expect(screen.getByText("Bienvenido a mi tienda online")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Usuario")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Contraseña")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument();
    });

    test("debe renderizar el botón para mostrar/ocultar contraseña", () => {
      renderLogin();
      expect(screen.getByTestId("icon-visibility-off")).toBeInTheDocument();
    });
  });

  describe("Interacciones de usuario", () => {
    test("debe actualizar el input de usuario", async () => {
      const user = userEvent.setup();
      renderLogin();

      const usernameInput = screen.getByPlaceholderText("Usuario");
      await user.type(usernameInput, "testuser");

      expect(usernameInput).toHaveValue("testuser");
    });

    test("debe alternar la visibilidad de la contraseña", async () => {
      const user = userEvent.setup();
      renderLogin();

      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const toggleButton = screen.getByTestId("icon-visibility-off").closest("button");

      expect(passwordInput).toHaveAttribute("type", "password");
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");
      expect(screen.getByTestId("icon-visibility")).toBeInTheDocument();
    });
  });

  describe("Envío del formulario", () => {
    test("debe validar campos vacíos en login", async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByRole("button", { name: "Ingresar" }));

      await waitFor(() => {
        expect(screen.getByText("Por favor ingresa usuario y contraseña")).toBeInTheDocument();
      });
      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    test("debe manejar la funcionalidad del botón demo", async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByRole("button", { name: "Llenar datos de demo" }));

      expect(screen.getByPlaceholderText("Usuario")).toHaveValue("demo");
      expect(screen.getByPlaceholderText("Contraseña")).toHaveValue("demo123");
    });

    test("debe llamar authService.login y onLogin en login exitoso", async () => {
      authService.login.mockResolvedValue({
        user: { id: 1, username: "demo", name: "Usuario Demo" },
        token: "jwt-token",
      });

      renderLogin();

      fireEvent.change(screen.getByPlaceholderText("Usuario"), {
        target: { value: "demo" },
      });
      fireEvent.change(screen.getByPlaceholderText("Contraseña"), {
        target: { value: "demo123" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          username: "demo",
          password: "demo123",
        });
        expect(mockOnLogin).toHaveBeenCalledWith(
          { id: 1, username: "demo", name: "Usuario Demo" },
          "jwt-token"
        );
      });
    });

    test("debe manejar error de login sin respuesta del servidor", async () => {
      const user = userEvent.setup();
      authService.login.mockRejectedValue(new Error("Network error"));

      renderLogin();

      await user.type(screen.getByPlaceholderText("Usuario"), "testuser");
      await user.type(screen.getByPlaceholderText("Contraseña"), "password123");
      await user.click(screen.getByRole("button", { name: "Ingresar" }));

      await waitFor(() => {
        expect(
          screen.getByText("Error al iniciar sesión. Por favor intenta nuevamente.")
        ).toBeInTheDocument();
      });
      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    test("debe limpiar el error cuando el usuario empieza a escribir", async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByRole("button", { name: "Ingresar" }));
      expect(screen.getByText("Por favor ingresa usuario y contraseña")).toBeInTheDocument();

      await user.type(screen.getByPlaceholderText("Usuario"), "t");
      expect(screen.queryByText("Por favor ingresa usuario y contraseña")).not.toBeInTheDocument();
    });

    test("debe manejar credenciales con solo espacios en blanco", async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByPlaceholderText("Usuario"), "   ");
      await user.type(screen.getByPlaceholderText("Contraseña"), "   ");
      await user.click(screen.getByRole("button", { name: "Ingresar" }));

      await waitFor(() => {
        expect(screen.getByText("Por favor ingresa usuario y contraseña")).toBeInTheDocument();
      });
      expect(mockOnLogin).not.toHaveBeenCalled();
    });
  });
});
