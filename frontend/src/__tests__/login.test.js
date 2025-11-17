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

describe("Login Tests", () => {
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnLogin.mockClear();
  });

  describe("Rendering", () => {
    test("should render login form", () => {
      render(<Login onLogin={mockOnLogin} />);
      
      expect(screen.getByText("Inicio de sesión")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Usuario")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Contraseña")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ingresar/i })).toBeInTheDocument();
    });

    test("should render password visibility toggle", () => {
      render(<Login onLogin={mockOnLogin} />);
      
      expect(screen.getByTestId("icon-visibility-off")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    test("should update username input", async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);
      
      const usernameInput = screen.getByPlaceholderText("Usuario");
      
      await act(async () => {
        await user.type(usernameInput, "testuser");
      });
      
      expect(usernameInput.value).toBe("testuser");
    });

    test("should toggle password visibility", async () => {
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

  describe("Form Submission", () => {
    test("should handle form validation for empty fields", async () => {
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

    test("should handle demo button functionality", async () => {
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
  });
});