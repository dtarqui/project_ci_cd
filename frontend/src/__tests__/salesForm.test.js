import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SalesForm from "../components/SalesForm";

describe("Componente SalesForm", () => {
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

  describe("Renderizado", () => {
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

  describe("Visualización de errores", () => {
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

  describe("Manejo de props", () => {
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

  describe("Estructura del formulario", () => {
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

  describe("Estructura de filas", () => {
    it("debe renderizar filas del formulario", () => {
      const { container } = render(<SalesForm {...defaultProps} />);
      const rows = container.querySelectorAll(".sales-form-row");
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe("Interacciones del formulario", () => {
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

  describe("Validación del formulario", () => {
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
  describe("Stock y líneas de la venta", () => {
    const stocked = [
      { id: 1, name: "Producto A", price: 100, stock: 5 },
      { id: 2, name: "Producto B", price: 200, stock: 0 },
    ];

    it("debe mostrar el stock disponible en cada opción de producto", () => {
      render(<SalesForm {...defaultProps} products={stocked} />);

      expect(screen.getAllByRole("option", { name: "Producto A (stock: 5)" }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("option", { name: "Producto B (stock: 0)" }).length).toBeGreaterThan(0);
    });

    it("debe mostrar el disponible junto a la cantidad al elegir un producto", async () => {
      const { container } = render(<SalesForm {...defaultProps} products={stocked} />);

      fireEvent.change(container.querySelectorAll("select")[3], { target: { value: "1" } });

      await waitFor(() => {
        expect(screen.getByText(/Disponible: 5/)).toBeInTheDocument();
      });
    });

    it("no debe mostrar stock cuando el producto no lo informa", () => {
      render(<SalesForm {...defaultProps} />);

      expect(screen.getAllByRole("option", { name: "Producto A" }).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Disponible:/)).not.toBeInTheDocument();
    });

    it("debe rechazar una cantidad mayor al stock antes de enviar", async () => {
      const { container } = render(<SalesForm {...defaultProps} products={stocked} />);

      fireEvent.change(container.querySelectorAll("select")[0], { target: { value: "1" } });
      fireEvent.change(container.querySelectorAll("select")[3], { target: { value: "1" } });
      fireEvent.change(container.querySelector('input[type="number"][min="1"]'), {
        target: { value: "9" },
      });
      fireEvent.submit(container.querySelector("form"));

      await waitFor(() => {
        // Aparece dos veces a proposito: en el banner de arriba y en la linea.
        expect(screen.getAllByText("Solo hay 5 en stock.")).toHaveLength(2);
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("debe quitar el aviso de stock al corregir la cantidad", async () => {
      const { container } = render(<SalesForm {...defaultProps} products={stocked} />);

      fireEvent.change(container.querySelectorAll("select")[0], { target: { value: "1" } });
      fireEvent.change(container.querySelectorAll("select")[3], { target: { value: "1" } });
      const quantity = container.querySelector('input[type="number"][min="1"]');
      fireEvent.change(quantity, { target: { value: "9" } });
      fireEvent.submit(container.querySelector("form"));

      await waitFor(() => {
        expect(screen.getAllByText("Solo hay 5 en stock.")).toHaveLength(2);
      });

      fireEvent.change(quantity, { target: { value: "3" } });

      // Se va tanto el aviso de la linea como el banner.
      await waitFor(() => {
        expect(screen.queryAllByText("Solo hay 5 en stock.")).toHaveLength(0);
      });
    });

    it("debe rechazar el mismo producto en dos líneas", async () => {
      const { container } = render(<SalesForm {...defaultProps} products={stocked} />);

      fireEvent.change(container.querySelectorAll("select")[0], { target: { value: "1" } });
      await userEvent.click(screen.getByRole("button", { name: /agregar item/i }));

      const selects = container.querySelectorAll("select");
      fireEvent.change(selects[3], { target: { value: "1" } });
      fireEvent.change(selects[4], { target: { value: "1" } });
      fireEvent.submit(container.querySelector("form"));

      await waitFor(() => {
        expect(
          screen.getAllByText(/ya está en otra línea/i).length
        ).toBeGreaterThan(0);
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("debe aceptar la venta cuando la cantidad cabe en el stock", async () => {
      mockOnSave.mockResolvedValueOnce({});
      const { container } = render(<SalesForm {...defaultProps} products={stocked} />);

      fireEvent.change(container.querySelectorAll("select")[0], { target: { value: "1" } });
      fireEvent.change(container.querySelectorAll("select")[3], { target: { value: "1" } });
      fireEvent.change(container.querySelector('input[type="number"][min="1"]'), {
        target: { value: "5" },
      });
      fireEvent.submit(container.querySelector("form"));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            customerId: 1,
            items: [{ productId: 1, quantity: 5 }],
          })
        );
      });
    });
  });

  describe("Tope del descuento", () => {
    it("debe avisar en el campo cuando el descuento supera el total", async () => {
      const { container } = render(<SalesForm {...defaultProps} />);

      fireEvent.change(container.querySelectorAll("select")[3], { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/Descuento/i), { target: { value: "500" } });

      await waitFor(() => {
        expect(screen.getByText(/No puede superar/i)).toBeInTheDocument();
      });
    });

    it("no debe guardar una venta cuyo descuento supera el total", async () => {
      const { container } = render(<SalesForm {...defaultProps} />);

      fireEvent.change(container.querySelectorAll("select")[0], { target: { value: "1" } });
      fireEvent.change(container.querySelectorAll("select")[3], { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/Descuento/i), { target: { value: "500" } });
      fireEvent.submit(container.querySelector("form"));

      await waitFor(() => {
        expect(
          container.querySelector(".sales-form-error").textContent
        ).toMatch(/El descuento no puede superar/i);
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("debe aceptar un descuento igual al total", async () => {
      mockOnSave.mockResolvedValueOnce({});
      const { container } = render(<SalesForm {...defaultProps} />);

      fireEvent.change(container.querySelectorAll("select")[0], { target: { value: "1" } });
      fireEvent.change(container.querySelectorAll("select")[3], { target: { value: "1" } });
      // 100 de subtotal + 13 de impuesto
      fireEvent.change(screen.getByLabelText(/Descuento/i), { target: { value: "113" } });
      fireEvent.submit(container.querySelector("form"));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({ discount: 113 })
        );
      });
    });
  });

  describe("Cliente nuevo desde la venta", () => {
    const cities = [
      { name: "La Paz", postalPrefix: "LP", areaCode: "22" },
      { name: "Cochabamba", postalPrefix: "CB", areaCode: "44" },
    ];

    // Imita lo que hace SalesSection: crea el cliente, lo agrega a la lista y lo
    // devuelve para que el formulario lo deje seleccionado.
    const Harness = ({ onCreate }) => {
      const [customers, setCustomers] = React.useState(mockCustomers);
      const handleCreate = async (data) => {
        const created = { id: 99, name: data.name };
        setCustomers((prev) => [...prev, created]);
        if (onCreate) onCreate(data);
        return created;
      };
      return (
        <SalesForm
          {...defaultProps}
          customers={customers}
          cities={cities}
          onCreateCustomer={handleCreate}
        />
      );
    };

    // fireEvent en vez de userEvent.selectOptions: la opcion no llega a quedar
    // seleccionada a proposito (el select vuelve a lo que hubiera), y eso
    // confunde a userEvent.
    const openCustomerForm = async () =>
      fireEvent.change(screen.getByLabelText("Cliente"), {
        target: { value: "__nuevo_cliente__" },
      });

    const fillCustomer = async () => {
      await userEvent.type(screen.getByLabelText(/Nombre/i), "Cliente Nuevo");
      await userEvent.type(screen.getByLabelText(/Email/i), "nuevo@email.com");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "22123456");
    };

    it("no debe ofrecer la opción si la sección no sabe crear clientes", () => {
      render(<SalesForm {...defaultProps} />);
      expect(
        screen.queryByRole("option", { name: /nuevo cliente/i })
      ).not.toBeInTheDocument();
    });

    it("debe ofrecer el alta como primera opción del desplegable", () => {
      render(<Harness />);

      const options = Array.from(screen.getByLabelText("Cliente").options);
      expect(options[0].textContent).toMatch(/selecciona un cliente/i);
      expect(options[1].textContent).toMatch(/nuevo cliente/i);
      // Los clientes existentes van después, agrupados.
      expect(options[2].textContent).toBe("Cliente A");
    });

    it("debe dejar el cliente como estaba si se cancela el alta", async () => {
      render(<Harness />);

      fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "1" } });
      await openCustomerForm();

      const customerModal = document.querySelector(".customer-form-modal");
      await userEvent.click(
        within(customerModal).getByRole("button", { name: /cancelar/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Cliente")).toHaveValue("1");
      });
    });

    it("debe abrir el formulario de cliente sobre el de venta", async () => {
      render(<Harness />);

      await openCustomerForm();

      expect(screen.getByRole("heading", { name: "Nuevo Cliente" })).toBeInTheDocument();
      // La venta sigue abierta detrás.
      expect(screen.getByText("Nueva Venta")).toBeInTheDocument();
    });

    it("debe ofrecer el catálogo de ciudades en el formulario anidado", async () => {
      render(<Harness />);

      await openCustomerForm();

      expect(screen.getByRole("option", { name: "La Paz" })).toBeInTheDocument();
    });

    it("debe crear el cliente y dejarlo seleccionado en la venta", async () => {
      const onCreate = jest.fn();
      render(<Harness onCreate={onCreate} />);

      await openCustomerForm();
      await fillCustomer();
      await userEvent.click(screen.getByRole("button", { name: /crear/i }));

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Cliente Nuevo",
            email: "nuevo@email.com",
            phone: "22123456",
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByLabelText("Cliente")).toHaveValue("99");
      });
    });

    it("debe cerrar el formulario de cliente tras crearlo", async () => {
      render(<Harness />);

      await openCustomerForm();
      await fillCustomer();
      await userEvent.click(screen.getByRole("button", { name: /crear/i }));

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: "Nuevo Cliente" })
        ).not.toBeInTheDocument();
      });
    });

    it("debe conservar los productos ya cargados al crear el cliente", async () => {
      const { container } = render(<Harness />);

      fireEvent.change(container.querySelectorAll("select")[3], { target: { value: "2" } });
      fireEvent.change(container.querySelector('input[type="number"][min="1"]'), {
        target: { value: "3" },
      });

      await openCustomerForm();
      await fillCustomer();
      await userEvent.click(screen.getByRole("button", { name: /crear/i }));

      await waitFor(() => {
        expect(screen.getByLabelText("Cliente")).toHaveValue("99");
      });
      // La linea cargada antes de abrir el formulario sigue ahi.
      expect(container.querySelectorAll("select")[3]).toHaveValue("2");
      expect(container.querySelector('input[type="number"][min="1"]')).toHaveValue(3);
    });

    it("debe cerrar el formulario de cliente al cancelar, sin tocar la venta", async () => {
      render(<Harness />);

      await openCustomerForm();
      const customerModal = document.querySelector(".customer-form-modal");
      await userEvent.click(
        within(customerModal).getByRole("button", { name: /cancelar/i })
      );

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: "Nuevo Cliente" })
        ).not.toBeInTheDocument();
      });
      expect(screen.getByText("Nueva Venta")).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

});
