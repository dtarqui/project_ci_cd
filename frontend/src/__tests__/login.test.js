import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "../login";

// Mock de react-icons
jest.mock("react-icons/md", () => ({
  MdVisibility: () => <div data-testid="icon-visibility">Show</div>,
  MdVisibilityOff: () => <div data-testid="icon-visibility-off">Hide</div>
}));

// Mock del authService
const mockAuthService = {
  login: jest.fn()
};

jest.mock("../services/api", () => ({
  authService: mockAuthService
}));

describe("Pruebas de Login", () => {
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnLogin.mockClear();
  });

  describe("Renderizado", () => {
    test("debe renderizar el formulario de login", () => {
      render(<Login onLogin={mockOnLogin} />);
      
      expect(screen.getByText("Inicio de sesión")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Usuario")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Contraseña")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ingresar/i })).toBeInTheDocument();
    });

    test("debe renderizar el botón para mostrar/ocultar contraseña", () => {
      render(<Login onLogin={mockOnLogin} />);
      
      expect(screen.getByTestId("icon-visibility-off")).toBeInTheDocument();
    });
  });

  describe("Interacciones de usuario", () => {
    test("debe actualizar el input de usuario", async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);
      
      const usernameInput = screen.getByPlaceholderText("Usuario");
      
      await act(async () => {
        await user.type(usernameInput, "testuser");
      });
      
      expect(usernameInput.value).toBe("testuser");
    });

    test("debe alternar la visibilidad de la contraseña", async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);
      
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const toggleButton = screen.getByTestId("icon-visibility-off").closest('button');
      
      // Initially hidden
      expect(passwordInput.type).toBe("password");
      expect(screen.getByTestId("icon-visibility-off")).toBeInTheDocument();
      
      // Click to show
      await act(async () => {
        await user.click(toggleButton);
      });
      
      expect(passwordInput.type).toBe("text");
      expect(screen.getByTestId("icon-visibility")).toBeInTheDocument();
    });
  });

  describe("Envío del formulario", () => {
    test("debe validar campos vacíos en el formulario", async () => {
      const user = userEvent.setup();
      
      render(<Login onLogin={mockOnLogin} />);
      
      const submitButton = screen.getByRole("button", { name: /ingresar/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText("Por favor ingresa usuario y contraseña")).toBeInTheDocument();
        expect(mockOnLogin).not.toHaveBeenCalled();
      });
    });

    test("debe manejar la funcionalidad del botón demo", async () => {
      const user = userEvent.setup();
      
      render(<Login onLogin={mockOnLogin} />);
      
      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const demoButton = screen.getByText("Llenar datos de demo");
      
      await act(async () => {
        await user.click(demoButton);
      });
      
      expect(usernameInput.value).toBe("demo");
      expect(passwordInput.value).toBe("demo123");
    });

    test("debe manejar error de login sin respuesta del servidor", async () => {
      const user = userEvent.setup();
      
      mockAuthService.login.mockRejectedValue(new Error("Network error"));
      
      render(<Login onLogin={mockOnLogin} />);
      
      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });
      
      await act(async () => {
        await user.type(usernameInput, "testuser");
        await user.type(passwordInput, "password123");
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText("Error al iniciar sesión. Por favor intenta nuevamente.")).toBeInTheDocument();
        expect(mockOnLogin).not.toHaveBeenCalled();
      });
    });

    test("debe limpiar el error cuando el usuario empieza a escribir", async () => {
      const user = userEvent.setup();
      
      render(<Login onLogin={mockOnLogin} />);
      
      const submitButton = screen.getByRole("button", { name: /ingresar/i });
      const usernameInput = screen.getByPlaceholderText("Usuario");
      
      // Generar un error primero
      await act(async () => {
        await user.click(submitButton);
      });
      
      expect(screen.getByText("Por favor ingresa usuario y contraseña")).toBeInTheDocument();
      
      // Empezar a escribir
      await act(async () => {
        await user.type(usernameInput, "t");
      });
      
      // El error debe desaparecer
      expect(screen.queryByText("Por favor ingresa usuario y contraseña")).not.toBeInTheDocument();
    });

    test("debe manejar credenciales con solo espacios en blanco", async () => {
      const user = userEvent.setup();
      
      render(<Login onLogin={mockOnLogin} />);
      
      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });
      
      await act(async () => {
        await user.type(usernameInput, "   ");
        await user.type(passwordInput, "   ");
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText("Por favor ingresa usuario y contraseña")).toBeInTheDocument();
        expect(mockOnLogin).not.toHaveBeenCalled();
      });
    });
  });
});
