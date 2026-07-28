import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CustomerForm from "../components/CustomerForm";

describe("Componente CustomerForm", () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  const defaultProps = {
    customer: null,
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Renderizado", () => {
    it("no debe renderizar nada cuando isOpen es false", () => {
      render(<CustomerForm {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Nuevo Cliente")).not.toBeInTheDocument();
    });

    it("debe mostrar el título 'Nuevo Cliente' al crear", () => {
      render(<CustomerForm {...defaultProps} />);
      expect(screen.getByText("Nuevo Cliente")).toBeInTheDocument();
    });

    it("debe mostrar el título 'Editar Cliente' cuando se edita", () => {
      const customer = {
        id: 1,
        name: "Juan García",
        email: "juan@example.com",
        phone: "1234567890",
        address: "",
        city: "",
        postalCode: "",
      };
      render(<CustomerForm {...defaultProps} customer={customer} />);
      expect(screen.getByText("Editar Cliente")).toBeInTheDocument();
    });

    it("debe renderizar todos los campos del formulario", () => {
      render(<CustomerForm {...defaultProps} />);
      expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Dirección/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Ciudad/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Código Postal/i)).toBeInTheDocument();
    });
  });

  describe("Edición", () => {
    it("debe prellenar el formulario con los datos del cliente", () => {
      const customer = {
        id: 1,
        name: "Juan García",
        email: "juan@example.com",
        phone: "1234567890",
        address: "Calle 1",
        city: "Madrid",
        postalCode: "28001",
      };
      render(<CustomerForm {...defaultProps} customer={customer} />);

      expect(screen.getByDisplayValue("Juan García")).toBeInTheDocument();
      expect(screen.getByDisplayValue("juan@example.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("1234567890")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Calle 1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Madrid")).toBeInTheDocument();
      expect(screen.getByDisplayValue("28001")).toBeInTheDocument();
    });
  });

  describe("Validación", () => {
    it("debe validar que el nombre sea requerido", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Email/i), "test@test.com");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "1234567890");
      await userEvent.click(screen.getByRole("button", { name: /crear/i }));

      expect(screen.getByText(/el nombre es requerido/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe validar que el email sea requerido", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Test");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "1234567890");
      await userEvent.click(screen.getByRole("button", { name: /crear/i }));

      expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe validar el largo mínimo del teléfono", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Test");
      await userEvent.type(screen.getByLabelText(/Email/i), "test@test.com");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "123");
      await userEvent.click(screen.getByRole("button", { name: /crear/i }));

      expect(
        screen.getByText(/el teléfono debe tener al menos 10 caracteres/i)
      ).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe limpiar el error del campo cuando el usuario escribe", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.click(screen.getByRole("button", { name: /crear/i }));
      expect(screen.getByText(/el nombre es requerido/i)).toBeInTheDocument();

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Test");
      expect(screen.queryByText(/el nombre es requerido/i)).not.toBeInTheDocument();
    });
  });

  describe("Envío", () => {
    it("debe enviar los datos recortados al onSubmit", async () => {
      mockOnSubmit.mockResolvedValueOnce({});
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "  Test Customer  ");
      await userEvent.type(screen.getByLabelText(/Email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "1234567890");
      await userEvent.click(screen.getByRole("button", { name: /crear/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Test Customer",
            email: "test@example.com",
            phone: "1234567890",
          })
        );
      });
    });

    it("debe cerrar el modal después de guardar correctamente", async () => {
      mockOnSubmit.mockResolvedValueOnce({});
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Test");
      await userEvent.type(screen.getByLabelText(/Email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "1234567890");
      await userEvent.click(screen.getByRole("button", { name: /crear/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("debe mostrar el error inline cuando onSubmit falla", async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error("Create failed"));
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Test");
      await userEvent.type(screen.getByLabelText(/Email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "1234567890");
      await userEvent.click(screen.getByRole("button", { name: /crear/i }));

      await waitFor(() => {
        expect(screen.getByText("Create failed")).toBeInTheDocument();
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("Interacciones", () => {
    it("debe llamar onClose cuando se hace clic en Cancelar", async () => {
      render(<CustomerForm {...defaultProps} />);
      await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("debe llamar onClose al hacer clic en el overlay", async () => {
      const { container } = render(<CustomerForm {...defaultProps} />);
      await userEvent.click(container.querySelector(".customer-form-overlay"));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
