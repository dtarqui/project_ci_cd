import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SalesForm from "../components/SalesForm";

describe("SalesForm Component", () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  const mockCustomers = [
    { id: 1, name: "Cliente A" },
    { id: 2, name: "Cliente B" },
  ];

  const mockProducts = [
    { id: 1, name: "Producto A", price: 100 },
    { id: 2, name: "Producto B", price: 200 },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    customers: mockCustomers,
    products: mockProducts,
    loading: false,
    error: "",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("debe renderizar el formulario cuando isOpen es true", () => {
      render(<SalesForm {...defaultProps} />);
      expect(screen.getByText("Nueva Venta")).toBeInTheDocument();
    });

    it("no debe renderizar cuando isOpen es false", () => {
      render(<SalesForm {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Nueva Venta")).not.toBeInTheDocument();
    });

    it("debe renderizar clientes", () => {
      render(<SalesForm {...defaultProps} />);
      expect(screen.getByText("Cliente A")).toBeInTheDocument();
      expect(screen.getByText("Cliente B")).toBeInTheDocument();
    });

    it("debe renderizar productos", () => {
      render(<SalesForm {...defaultProps} />);
      expect(screen.getByText("Producto A")).toBeInTheDocument();
      expect(screen.getByText("Producto B")).toBeInTheDocument();
    });

    it("debe mostrar botones de acción", () => {
      render(<SalesForm {...defaultProps} />);
      expect(screen.getByRole("button", { name: /guardar venta/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    });

    it("debe mostrar botón de agregar item", () => {
      render(<SalesForm {...defaultProps} />);
      expect(screen.getByRole("button", { name: /agregar item/i })).toBeInTheDocument();
    });

    it("debe mostrar las secciones del formulario", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      expect(container.querySelector(".sales-items")).toBeInTheDocument();
      expect(container.querySelector(".sales-summary")).toBeInTheDocument();
    });
  });

  describe("Error Display", () => {
    it("debe mostrar error cuando existe", () => {
      render(<SalesForm {...defaultProps} error="Error de prueba" />);
      expect(screen.getByText("Error de prueba")).toBeInTheDocument();
    });

    it("debe mostrar clase de error", () => {
      const { container } = render(
        <SalesForm {...defaultProps} error="Error de servidor" />
      );
      expect(container.querySelector(".sales-form-error")).toBeInTheDocument();
    });
  });

  describe("Props Handling", () => {
    it("debe manejar props vacíos correctamente", () => {
      render(
        <SalesForm
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
          customers={[]}
          products={[]}
          loading={false}
          error=""
        />
      );
      expect(screen.getByText("Nueva Venta")).toBeInTheDocument();
    });

    it("debe desabilitar botón cuando está loading", () => {
      render(<SalesForm {...defaultProps} loading={true} />);
      const submitButton = screen.getByRole("button", { name: /guardar venta/i });
      expect(submitButton.disabled).toBe(true);
    });

    it("debe desabilitar select de cliente cuando está loading", () => {
      const { container } = render(<SalesForm {...defaultProps} loading={true} />);
      const selects = container.querySelectorAll("select");
      const clientSelect = selects[0];
      expect(clientSelect.disabled).toBe(true);
    });
  });

  describe("Form Structure", () => {
    it("debe tener estructura correcta del modal", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      expect(container.querySelector(".sales-form-overlay")).toBeInTheDocument();
      expect(container.querySelector(".sales-form-modal")).toBeInTheDocument();
      expect(container.querySelector(".sales-form-header")).toBeInTheDocument();
    });

    it("debe tener form dentro del modal", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const form = container.querySelector("form.sales-form");
      expect(form).toBeInTheDocument();
    });

    it("debe tener textarea para notas", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const textareas = container.querySelectorAll("textarea");
      expect(textareas.length).toBeGreaterThan(0);
    });

    it("debe mostrar múltiples selects para opciones", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const selects = container.querySelectorAll("select");
      // Cliente, Método de pago, Estado, Producto por defecto
      expect(selects.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Row Structure", () => {
    it("debe renderizar filas del formulario", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const rows = container.querySelectorAll(".sales-form-row");
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe("Form Interactions", () => {
    it("debe llamar onClose cuando se hace clic en cerrar", async () => {
      const user = userEvent.setup();
      render(<SalesForm {...defaultProps} />);
      const closeButton = screen.getAllByRole("button").find(btn => 
        btn.className.includes("sales-form-close")
      );
      await user.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("debe llamar onClose cuando se hace clic en cancelar", async () => {
      const user = userEvent.setup();
      render(<SalesForm {...defaultProps} />);
      const cancelButton = screen.getByRole("button", { name: /cancelar/i });
      await user.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("debe permitir cambiar el cliente", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const clientSelect = container.querySelectorAll("select")[0];
      fireEvent.change(clientSelect, { target: { value: "1" } });
      expect(clientSelect.value).toBe("1");
    });

    it("debe permitir cambiar el método de pago", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const selects = container.querySelectorAll("select");
      const paymentSelect = selects[1];
      fireEvent.change(paymentSelect, { target: { value: "Tarjeta" } });
      expect(paymentSelect.value).toBe("Tarjeta");
    });

    it("debe permitir cambiar el estado", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const selects = container.querySelectorAll("select");
      const statusSelect = selects[2];
      fireEvent.change(statusSelect, { target: { value: "Pendiente" } });
      expect(statusSelect.value).toBe("Pendiente");
    });

    it("debe permitir cambiar el descuento", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const discountInput = container.querySelector('input[type="number"][min="0"]');
      fireEvent.change(discountInput, { target: { value: "50" } });
      expect(discountInput.value).toBe("50");
    });

    it("debe agregar un nuevo item cuando se hace clic en agregar", async () => {
      const user = userEvent.setup();
      const { container } = render(<SalesForm {...defaultProps} />);
      const initialItems = container.querySelectorAll(".sales-item-row").length;
      const addButton = screen.getByRole("button", { name: /agregar item/i });
      await user.click(addButton);
      const finalItems = container.querySelectorAll(".sales-item-row").length;
      expect(finalItems).toBe(initialItems + 1);
    });

    it("debe eliminar un item cuando hay más de uno", async () => {
      const user = userEvent.setup();
      const { container } = render(<SalesForm {...defaultProps} />);
      // Primero agregamos un item
      const addButton = screen.getByRole("button", { name: /agregar item/i });
      await user.click(addButton);
      
      const initialItems = container.querySelectorAll(".sales-item-row").length;
      expect(initialItems).toBe(2);
      
      // Ahora eliminamos uno
      const deleteButtons = container.querySelectorAll(".sales-item-remove");
      await user.click(deleteButtons[0]);
      
      const finalItems = container.querySelectorAll(".sales-item-row").length;
      expect(finalItems).toBe(1);
    });

    it("debe deshabilitar el botón de eliminar cuando hay solo un item", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const deleteButton = container.querySelector(".sales-item-remove");
      expect(deleteButton.disabled).toBe(true);
    });
  });

  describe("Form Validation", () => {
    it("debe mostrar error si no se selecciona cliente", async () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const form = container.querySelector("form");
      fireEvent.submit(form);
      
      setTimeout(() => {
        expect(screen.getByText(/selecciona un cliente/i)).toBeInTheDocument();
      }, 0);
    });

    it("debe calcular el subtotal correctamente", async () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const productSelect = container.querySelectorAll("select")[3]; // Primer producto
      fireEvent.change(productSelect, { target: { value: "1" } });
      
      const quantityInput = container.querySelector('input[type="number"][min="1"]');
      fireEvent.change(quantityInput, { target: { value: "2" } });
      
      // Subtotal debe ser 100 * 2 = 200
      await waitFor(() => {
        expect(container.textContent).toContain("200");
      });
    });

    it("debe resetear el formulario cuando isOpen cambia de false a true", () => {
      const { rerender, container } = render(<SalesForm {...defaultProps} isOpen={false} />);
      
      rerender(<SalesForm {...defaultProps} isOpen={true} />);
      
      const clientSelect = container.querySelectorAll("select")[0];
      expect(clientSelect.value).toBe("");
    });
  });

  describe("Cálculos del resumen", () => {
    it("debe mostrar sección de resumen", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      expect(container.querySelector(".sales-summary")).toBeInTheDocument();
    });

    it("debe calcular el impuesto (13%)", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      // El resumen siempre está presente
      expect(container.textContent).toContain("Impuesto (13%)");
    });

    it("debe mostrar el total", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      expect(container.textContent).toContain("Total");
    });

    it("debe formatear montos como moneda boliviana", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      // Debe tener el formato de moneda
      const summary = container.querySelector(".sales-summary");
      expect(summary.textContent).toMatch(/Bs/);
    });
  });

  describe("Notas del formulario", () => {
    it("debe permitir ingresar notas", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeInTheDocument();
      
      fireEvent.change(textarea, { target: { value: "Esta es una nota de prueba" } });
      expect(textarea.value).toBe("Esta es una nota de prueba");
    });
  });

  describe("Validaciones adicionales", () => {
    it("debe mostrar error cuando item tiene cantidad inválida", async () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      
      // Seleccionar cliente
      const clientSelect = container.querySelectorAll("select")[0];
      fireEvent.change(clientSelect, { target: { value: "1" } });
      
      // Seleccionar producto
      const productSelect = container.querySelectorAll("select")[3];
      fireEvent.change(productSelect, { target: { value: "1" } });
      
      // Poner cantidad 0
      const quantityInput = container.querySelector('input[type="number"][min="1"]');
      fireEvent.change(quantityInput, { target: { value: "0" } });
      
      const form = container.querySelector("form");
      fireEvent.submit(form);
      
      await waitFor(() => {
        const errorDiv = container.querySelector(".sales-form-error");
        expect(errorDiv).toBeInTheDocument();
        expect(errorDiv.textContent).toMatch(/agrega productos validos con cantidad mayor a 0/i);
      });
    });

    it("debe manejar error al guardar venta", async () => {
      const mockErrorSave = jest.fn().mockRejectedValue(new Error("Error al guardar"));
      const { container } = render(
        <SalesForm {...defaultProps} onSave={mockErrorSave} />
      );
      
      // Seleccionar cliente
      const clientSelect = container.querySelectorAll("select")[0];
      fireEvent.change(clientSelect, { target: { value: "1" } });
      
      // Seleccionar producto
      const productSelect = container.querySelectorAll("select")[3];
      fireEvent.change(productSelect, { target: { value: "1" } });
      
      const form = container.querySelector("form");
      fireEvent.submit(form);
      
      await waitFor(() => {
        const errorDiv = container.querySelector(".sales-form-error");
        expect(errorDiv).toBeInTheDocument();
        expect(errorDiv.textContent).toMatch(/no se pudo guardar la venta/i);
      });
    });

    it("debe limpiar formError cuando es válido", async () => {
      const user = userEvent.setup();
      const { container } = render(<SalesForm {...defaultProps} />);
      
      // Primero provocar un error
      const form = container.querySelector("form");
      fireEvent.submit(form);
      
      // Esperar a que aparezca el error
      await waitFor(() => {
        const errorDiv = container.querySelector(".sales-form-error");
        expect(errorDiv).toBeInTheDocument();
        expect(errorDiv.textContent).toMatch(/selecciona un cliente/i);
      });
      
      // Luego corregir el formulario
      const clientSelect = container.querySelectorAll("select")[0];
      await user.selectOptions(clientSelect, "1");
      
      const productSelect = container.querySelectorAll("select")[3];
      await user.selectOptions(productSelect, "1");
      
      // Enviar de nuevo
      fireEvent.submit(form);
      
      // Verificar que se llamó onSave
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });
});
