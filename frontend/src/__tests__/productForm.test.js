import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductForm from "../components/ProductForm";

describe("ProductForm Component", () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockCategories = ["Electrónica", "Ropa", "Alimentos"];

  const defaultProps = {
    product: null,
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    categories: mockCategories,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("debe renderizar el componente cuando isOpen es true", () => {
      render(<ProductForm {...defaultProps} />);
      expect(screen.getByText("Crear Nuevo Producto")).toBeInTheDocument();
    });

    it("no debe renderizar cuando isOpen es false", () => {
      render(<ProductForm {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Crear Nuevo Producto")).not.toBeInTheDocument();
    });

    it("debe mostrar título 'Editar Producto' cuando product existe", () => {
      const product = {
        id: 1,
        name: "Laptop",
        category: "Electrónica",
        price: 999.99,
        stock: 10,
      };
      render(<ProductForm {...defaultProps} product={product} />);
      expect(screen.getByText("Editar Producto")).toBeInTheDocument();
    });

    it("debe renderizar todos los campos del formulario", () => {
      render(<ProductForm {...defaultProps} />);
      expect(screen.getByLabelText(/nombre del producto/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/precio/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/stock/i)).toBeInTheDocument();
    });

    it("debe renderizar todas las categorías en el select", () => {
      render(<ProductForm {...defaultProps} />);
      mockCategories.forEach((category) => {
        expect(screen.getByText(category)).toBeInTheDocument();
      });
    });

    it("debe renderizar botones Cancelar y Guardar", () => {
      render(<ProductForm {...defaultProps} />);
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /guardar producto/i })
      ).toBeInTheDocument();
    });
  });

  describe("Crear Nuevo Producto", () => {
    it("debe permitir llenar el formulario con datos válidos", async () => {
      render(<ProductForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/nombre del producto/i);
      const categorySelect = screen.getByLabelText(/categoría/i);
      const priceInput = screen.getByLabelText(/precio/i);
      const stockInput = screen.getByLabelText(/stock/i);

      await userEvent.type(nameInput, "Laptop Dell XPS");
      await userEvent.selectOptions(categorySelect, "Electrónica");
      await userEvent.type(priceInput, "999.99");
      await userEvent.type(stockInput, "10");

      expect(nameInput.value).toBe("Laptop Dell XPS");
      expect(categorySelect.value).toBe("Electrónica");
      expect(priceInput.value).toBe("999.99");
      expect(stockInput.value).toBe("10");
    });

    it("debe validar que el nombre sea requerido", async () => {
      render(<ProductForm {...defaultProps} />);
      const submitButton = screen.getByRole("button", { name: /guardar/i });

      await userEvent.click(submitButton);

      expect(screen.getByText(/el nombre es requerido/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe validar que la categoría sea requerida", async () => {
      render(<ProductForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/nombre del producto/i);
      const submitButton = screen.getByRole("button", { name: /guardar/i });

      await userEvent.type(nameInput, "Laptop");
      await userEvent.click(submitButton);

      expect(screen.getByText(/la categoría es requerida/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe validar que el precio sea positivo", async () => {
      render(<ProductForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/nombre del producto/i);
      const categorySelect = screen.getByLabelText(/categoría/i);
      const stockInput = screen.getByLabelText(/stock/i);
      const submitButton = screen.getByRole("button", { name: /guardar/i });

      await userEvent.type(nameInput, "Laptop");
      await userEvent.selectOptions(categorySelect, "Electrónica");
      // Leave price empty to trigger validation
      await userEvent.type(stockInput, "10");
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/el precio debe ser un número positivo/i)
        ).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe validar que el stock sea no negativo", async () => {
      render(<ProductForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/nombre del producto/i);
      const categorySelect = screen.getByLabelText(/categoría/i);
      const priceInput = screen.getByLabelText(/precio/i);
      const submitButton = screen.getByRole("button", { name: /guardar/i });

      await userEvent.type(nameInput, "Laptop");
      await userEvent.selectOptions(categorySelect, "Electrónica");
      await userEvent.type(priceInput, "999");
      // Leave stock empty to trigger validation
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/el stock debe ser un número no negativo/i)
        ).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe enviar datos válidos al onSubmit", async () => {
      render(<ProductForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/nombre del producto/i);
      const categorySelect = screen.getByLabelText(/categoría/i);
      const priceInput = screen.getByLabelText(/precio/i);
      const stockInput = screen.getByLabelText(/stock/i);
      const submitButton = screen.getByRole("button", { name: /guardar/i });

      await userEvent.type(nameInput, "Laptop Dell");
      await userEvent.selectOptions(categorySelect, "Electrónica");
      await userEvent.type(priceInput, "999.99");
      await userEvent.type(stockInput, "10");
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "Laptop Dell",
          category: "Electrónica",
          price: 999.99,
          stock: 10,
        });
      });
    });
  });

  describe("Editar Producto", () => {
    it("debe prellenar el formulario con datos del producto", () => {
      const product = {
        id: 1,
        name: "Laptop XPS",
        category: "Electrónica",
        price: 1299.99,
        stock: 5,
      };
      render(<ProductForm {...defaultProps} product={product} />);

      expect(screen.getByDisplayValue("Laptop XPS")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Electrónica")).toBeInTheDocument();
      expect(screen.getByDisplayValue("1299.99")).toBeInTheDocument();
      expect(screen.getByDisplayValue("5")).toBeInTheDocument();
    });

    it("debe permitir actualizar los datos", async () => {
      const product = {
        id: 1,
        name: "Laptop XPS",
        category: "Electrónica",
        price: 1299.99,
        stock: 5,
      };
      render(<ProductForm {...defaultProps} product={product} />);

      const nameInput = screen.getByDisplayValue("Laptop XPS");
      const priceInput = screen.getByDisplayValue("1299.99");

      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Laptop XPS 15");
      await userEvent.clear(priceInput);
      await userEvent.type(priceInput, "1599.99");

      expect(nameInput.value).toBe("Laptop XPS 15");
      expect(priceInput.value).toBe("1599.99");
    });
  });

  describe("Interacciones", () => {
    it("debe llamar onClose cuando se hace clic en Cancelar", async () => {
      render(<ProductForm {...defaultProps} />);
      const cancelButton = screen.getByRole("button", { name: /cancelar/i });

      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("debe llamar onClose después de guardar correctamente", async () => {
      mockOnSubmit.mockResolvedValueOnce({});

      render(<ProductForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/nombre del producto/i);
      const categorySelect = screen.getByLabelText(/categoría/i);
      const priceInput = screen.getByLabelText(/precio/i);
      const stockInput = screen.getByLabelText(/stock/i);
      const submitButton = screen.getByRole("button", { name: /guardar/i });

      await userEvent.type(nameInput, "Laptop");
      await userEvent.selectOptions(categorySelect, "Electrónica");
      await userEvent.type(priceInput, "999");
      await userEvent.type(stockInput, "10");
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("debe mostrar estado de carga durante el envío", async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ProductForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/nombre del producto/i);
      const categorySelect = screen.getByLabelText(/categoría/i);
      const priceInput = screen.getByLabelText(/precio/i);
      const stockInput = screen.getByLabelText(/stock/i);
      const submitButton = screen.getByRole("button", { name: /guardar/i });

      await userEvent.type(nameInput, "Laptop");
      await userEvent.selectOptions(categorySelect, "Electrónica");
      await userEvent.type(priceInput, "999");
      await userEvent.type(stockInput, "10");
      await userEvent.click(submitButton);

      // El botón debe mostrar estado de carga
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /guardando/i })
        ).toBeInTheDocument();
      });
    });

    it("debe permitir cerrar el modal con el botón X", async () => {
      render(<ProductForm {...defaultProps} />);
      const closeButton = screen.getByLabelText(/cerrar formulario/i);

      await userEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Validación de Errores", () => {
    it("debe limpiar errores cuando el usuario empieza a escribir", async () => {
      render(<ProductForm {...defaultProps} />);
      const submitButton = screen.getByRole("button", { name: /guardar/i });
      const nameInput = screen.getByLabelText(/nombre del producto/i);

      // Enviar sin datos para mostrar error
      await userEvent.click(submitButton);
      expect(screen.getByText(/el nombre es requerido/i)).toBeInTheDocument();

      // Escribir en el input debe limpiar el error
      await userEvent.type(nameInput, "Laptop");
      expect(screen.queryByText(/el nombre es requerido/i)).not.toBeInTheDocument();
    });

    it("debe manejar errores del servidor", async () => {
      mockOnSubmit.mockRejectedValueOnce(
        new Error("Error al guardar el producto")
      );

      render(<ProductForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/nombre del producto/i);
      const categorySelect = screen.getByLabelText(/categoría/i);
      const priceInput = screen.getByLabelText(/precio/i);
      const stockInput = screen.getByLabelText(/stock/i);
      const submitButton = screen.getByRole("button", { name: /guardar/i });

      await userEvent.type(nameInput, "Laptop");
      await userEvent.selectOptions(categorySelect, "Electrónica");
      await userEvent.type(priceInput, "999");
      await userEvent.type(stockInput, "10");
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/error al guardar el producto/i)
        ).toBeInTheDocument();
      });
    });
  });
});
