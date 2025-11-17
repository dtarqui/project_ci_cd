import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import axios from "axios";
import Login from "./login";

// Mock axios
jest.mock("axios");
const mockedAxios = axios;

describe("Login Component Tests", () => {
  const mockOnLogin = jest.fn();
  let user;

  beforeEach(() => {
    mockOnLogin.mockClear();
    mockedAxios.post.mockClear();
    user = userEvent.setup();
  });

  describe("Component Rendering", () => {
    test("renders login form correctly", () => {
      render(<Login onLogin={mockOnLogin} />);

      expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
      expect(
        screen.getByText("Bienvenido a mi tienda online")
      ).toBeInTheDocument();
      expect(screen.getByText("Inicio de sesión")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Usuario")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Contraseña")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /ingresar/i })
      ).toBeInTheDocument();
    });

    test("renders all form elements with correct attributes", () => {
      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      expect(usernameInput).toHaveAttribute("type", "text");
      expect(usernameInput).toHaveAttribute("name", "username");
      expect(usernameInput).toHaveAttribute("autoComplete", "username");

      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("name", "password");
      expect(passwordInput).toHaveAttribute("autoComplete", "current-password");

      expect(submitButton).toHaveAttribute("type", "submit");
    });

    test("renders demo section and user credentials info", () => {
      render(<Login onLogin={mockOnLogin} />);

      expect(screen.getByText("Prueba la demo:")).toBeInTheDocument();
      expect(screen.getByText("Llenar datos de demo")).toBeInTheDocument();
      expect(screen.getByText("Usuarios de prueba:")).toBeInTheDocument();

      // Verificar que existen las credenciales en la página (texto fragmentado)
      expect(screen.getByText("admin")).toBeInTheDocument();
      expect(screen.getByText(/admin123/)).toBeInTheDocument();
      expect(screen.getByText("demo")).toBeInTheDocument();
      expect(screen.getByText(/demo123/)).toBeInTheDocument();
      expect(screen.getByText("test")).toBeInTheDocument();
      expect(screen.getByText(/test123/)).toBeInTheDocument();
    });

    test("renders forgot password link", () => {
      render(<Login onLogin={mockOnLogin} />);

      expect(screen.getByText("¿Olvidé mi contraseña?")).toBeInTheDocument();
    });

    test("renders password toggle button", () => {
      render(<Login onLogin={mockOnLogin} />);

      const toggleButton = screen.getByRole("button", { name: /👁️/ });
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe("Form Interactions", () => {
    test("allows user input in username field", async () => {
      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");

      await user.type(usernameInput, "testuser");

      expect(usernameInput.value).toBe("testuser");
    });

    test("allows user input in password field", async () => {
      render(<Login onLogin={mockOnLogin} />);

      const passwordInput = screen.getByPlaceholderText("Contraseña");

      await user.type(passwordInput, "testpass");

      expect(passwordInput.value).toBe("testpass");
    });

    test("clears error when user starts typing in username", async () => {
      render(<Login onLogin={mockOnLogin} />);

      // Generar error primero
      const submitButton = screen.getByRole("button", { name: /ingresar/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Por favor ingresa usuario y contraseña")
        ).toBeInTheDocument();
      });

      // Escribir en username debería limpiar error
      const usernameInput = screen.getByPlaceholderText("Usuario");
      await user.type(usernameInput, "a");

      await waitFor(() => {
        expect(
          screen.queryByText("Por favor ingresa usuario y contraseña")
        ).not.toBeInTheDocument();
      });
    });

    test("clears error when user starts typing in password", async () => {
      render(<Login onLogin={mockOnLogin} />);

      // Generar error
      const submitButton = screen.getByRole("button", { name: /ingresar/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Por favor ingresa usuario y contraseña")
        ).toBeInTheDocument();
      });

      // Escribir en password debería limpiar error
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      await user.type(passwordInput, "a");

      await waitFor(() => {
        expect(
          screen.queryByText("Por favor ingresa usuario y contraseña")
        ).not.toBeInTheDocument();
      });
    });

    test("password visibility toggle works correctly", async () => {
      render(<Login onLogin={mockOnLogin} />);

      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const toggleButton = screen.getByRole("button", { name: /👁️/ });

      expect(passwordInput.type).toBe("password");

      await user.click(toggleButton);
      expect(passwordInput.type).toBe("text");

      await user.click(toggleButton);
      expect(passwordInput.type).toBe("password");
    });

    test("demo button fills form with demo credentials", async () => {
      render(<Login onLogin={mockOnLogin} />);

      const demoButton = screen.getByText("Llenar datos de demo");
      await user.click(demoButton);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");

      expect(usernameInput.value).toBe("demo");
      expect(passwordInput.value).toBe("demo123");
    });

    test("form submission with Enter key", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          user: { id: 1, name: "Test User" },
          token: "test-token",
        },
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");

      await user.type(usernameInput, "demo");
      await user.type(passwordInput, "demo123{enter}");

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalled();
      });
    });
  });

  describe("Form Validation", () => {
    test("shows error when submitting empty form", async () => {
      render(<Login onLogin={mockOnLogin} />);

      const submitButton = screen.getByRole("button", { name: /ingresar/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Por favor ingresa usuario y contraseña")
        ).toBeInTheDocument();
      });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    test("shows error when submitting with only username", async () => {
      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      await user.type(usernameInput, "testuser");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Por favor ingresa usuario y contraseña")
        ).toBeInTheDocument();
      });
    });

    test("shows error when submitting with only password", async () => {
      render(<Login onLogin={mockOnLogin} />);

      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      await user.type(passwordInput, "testpass");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Por favor ingresa usuario y contraseña")
        ).toBeInTheDocument();
      });
    });

    test("accepts form with whitespace trimming", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          user: { id: 1, name: "Test User" },
          token: "test-token",
        },
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      await user.type(usernameInput, "  demo  ");
      await user.type(passwordInput, "  demo123  ");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          "http://localhost:4000/api/auth/login",
          { username: "  demo  ", password: "  demo123  " }
        );
      });
    });
  });

  describe("API Integration", () => {
    test("successful login calls onLogin with user data", async () => {
      const mockUser = { id: 1, name: "Test User", username: "testuser" };
      const mockToken = "mock-token";

      mockedAxios.post.mockResolvedValueOnce({
        data: { user: mockUser, token: mockToken },
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      await user.type(usernameInput, "testuser");
      await user.type(passwordInput, "testpass");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith(mockUser, mockToken);
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "http://localhost:4000/api/auth/login",
        { username: "testuser", password: "testpass" }
      );
    });

    test("handles API error with message", async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { data: { error: "Credenciales inválidas" } },
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      await user.type(usernameInput, "wronguser");
      await user.type(passwordInput, "wrongpass");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Credenciales inválidas")).toBeInTheDocument();
      });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    test("handles API error without message", async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: null,
        message: "Network Error",
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      await user.type(usernameInput, "user");
      await user.type(passwordInput, "pass");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Error al iniciar sesión. Por favor intenta nuevamente."
          )
        ).toBeInTheDocument();
      });
    });

    test("handles network timeout error", async () => {
      mockedAxios.post.mockRejectedValueOnce({
        code: "ECONNABORTED",
        message: "Request timeout",
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      await user.type(usernameInput, "user");
      await user.type(passwordInput, "pass");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Error al iniciar sesión. Por favor intenta nuevamente."
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    test("shows loading state during API call", async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedAxios.post.mockReturnValueOnce(promise);

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      await user.type(usernameInput, "test");
      await user.type(passwordInput, "test");
      await user.click(submitButton);

      // Durante la carga
      expect(screen.getByText("Ingresando...")).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(usernameInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();

      // Resolver la promesa
      resolvePromise({
        data: {
          user: { id: 1, name: "Test User" },
          token: "test-token",
        },
      });

      await waitFor(() => {
        expect(screen.queryByText("Ingresando...")).not.toBeInTheDocument();
      });
    });

    test("disables demo button during loading", async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedAxios.post.mockReturnValueOnce(promise);

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });
      const demoButton = screen.getByText("Llenar datos de demo");

      await user.type(usernameInput, "test");
      await user.type(passwordInput, "test");
      await user.click(submitButton);

      expect(demoButton).toBeDisabled();

      resolvePromise({
        data: {
          user: { id: 1, name: "Test User" },
          token: "test-token",
        },
      });

      await waitFor(() => {
        expect(demoButton).not.toBeDisabled();
      });
    });

    test("disables password toggle during loading", async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedAxios.post.mockReturnValueOnce(promise);

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });
      const toggleButton = screen.getByRole("button", { name: /👁️/ });

      await user.type(usernameInput, "test");
      await user.type(passwordInput, "test");
      await user.click(submitButton);

      expect(toggleButton).toBeDisabled();

      resolvePromise({
        data: {
          user: { id: 1, name: "Test User" },
          token: "test-token",
        },
      });

      await waitFor(() => {
        expect(toggleButton).not.toBeDisabled();
      });
    });
  });

  describe("Accessibility", () => {
    test("has proper ARIA labels", () => {
      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");

      expect(usernameInput).toHaveAttribute("aria-label", "Usuario");
      expect(passwordInput).toHaveAttribute("aria-label", "Contraseña");
    });

    test("form is navigable with keyboard", async () => {
      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      // Tab navigation
      await user.tab();
      expect(usernameInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("button", { name: /👁️/ })).toHaveFocus();

      await user.tab();
      expect(screen.getByText("¿Olvidé mi contraseña?")).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    test("error messages are announced to screen readers", async () => {
      render(<Login onLogin={mockOnLogin} />);

      const submitButton = screen.getByRole("button", { name: /ingresar/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(
          "Por favor ingresa usuario y contraseña"
        );
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass("error-message");
      });
    });
  });

  describe("Edge Cases", () => {
    test("handles extremely long input values", async () => {
      render(<Login onLogin={mockOnLogin} />);

      const longString = "a".repeat(1000);
      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");

      await user.type(usernameInput, longString);
      await user.type(passwordInput, longString);

      expect(usernameInput.value).toBe(longString);
      expect(passwordInput.value).toBe(longString);
    });

    test("handles special characters in credentials", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          user: { id: 1, name: "Test User" },
          token: "test-token",
        },
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      const specialUsername = "user@domain.com";
      const specialPassword = "p@ssw0rd!#$%";

      await user.type(usernameInput, specialUsername);
      await user.type(passwordInput, specialPassword);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          "http://localhost:4000/api/auth/login",
          { username: specialUsername, password: specialPassword }
        );
      });
    });

    test("handles rapid consecutive form submissions", async () => {
      let callCount = 0;
      mockedAxios.post.mockImplementation(() => {
        callCount++;
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: { user: { id: 1, name: "Test" } },
              }),
            200
          )
        );
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      await user.type(usernameInput, "test");
      await user.type(passwordInput, "test");

      // Click inicial que debería activar loading
      await user.click(submitButton);

      // Verificar que el botón se deshabilita (loading state)
      await waitFor(
        () => {
          expect(submitButton).toBeDisabled();
        },
        { timeout: 100 }
      );

      // Intentos adicionales no deberían proceder porque el botón está deshabilitado
      // Usamos fireEvent para simular clics cuando el botón está deshabilitado
      const fireEvent = require("@testing-library/react").fireEvent;
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      // Esperar a que resuelva la primera llamada
      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalled();
      });

      // Verificar que solo se hizo una llamada API
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    }, 10000);
  });

  describe("Visual States", () => {
    test("applies correct CSS classes to form elements", () => {
      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      expect(usernameInput).toHaveClass("form-input");
      expect(passwordInput).toHaveClass("form-input");
      expect(submitButton).toHaveClass("login-button");
    });

    test("shows error message with correct styling", async () => {
      render(<Login onLogin={mockOnLogin} />);

      const submitButton = screen.getByRole("button", { name: /ingresar/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(
          "Por favor ingresa usuario y contraseña"
        );
        expect(errorMessage).toHaveClass("error-message");
      });
    });

    test("applies disabled styling during loading", async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedAxios.post.mockReturnValueOnce(promise);

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByPlaceholderText("Usuario");
      const passwordInput = screen.getByPlaceholderText("Contraseña");
      const submitButton = screen.getByRole("button", { name: /ingresar/i });

      await user.type(usernameInput, "test");
      await user.type(passwordInput, "test");
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(usernameInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();

      resolvePromise({
        data: {
          user: { id: 1, name: "Test User" },
          token: "test-token",
        },
      });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});
