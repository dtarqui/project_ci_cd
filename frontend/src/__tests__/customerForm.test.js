import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CustomerForm from "../components/CustomerForm";

describe("Componente CustomerForm", () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  // Mismo contrato que devuelve GET /api/customers/cities.
  const cities = [
    { name: "La Paz", postalPrefix: "LP", areaCode: "22" },
    { name: "Cochabamba", postalPrefix: "CB", areaCode: "44" },
  ];

  const defaultProps = {
    customer: null,
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    cities,
  };

  // Datos minimos validos, para que cada caso solo altere lo que prueba.
  const fillValidBase = async () => {
    await userEvent.type(screen.getByLabelText(/Nombre/i), "Cliente Valido");
    await userEvent.type(screen.getByLabelText(/Email/i), "cliente@email.com");
    await userEvent.type(screen.getByLabelText(/Teléfono/i), "22123456");
  };

  const submit = () => userEvent.click(screen.getByRole("button", { name: /crear/i }));

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
        phone: "22123456",
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

    it("debe indicar que el teléfono va sin código de país", () => {
      render(<CustomerForm {...defaultProps} />);
      expect(screen.getByText(/8 dígitos, sin código de país/i)).toBeInTheDocument();
    });
  });

  describe("Catálogo de ciudades", () => {
    it("debe ofrecer la ciudad como lista con las opciones del catálogo", () => {
      render(<CustomerForm {...defaultProps} />);

      const city = screen.getByLabelText(/Ciudad/i);
      expect(city.tagName).toBe("SELECT");
      expect(screen.getByRole("option", { name: "La Paz" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Cochabamba" })).toBeInTheDocument();
    });

    it("debe volver a texto libre si el catálogo no se pudo cargar", () => {
      render(<CustomerForm {...defaultProps} cities={[]} />);

      const city = screen.getByLabelText(/Ciudad/i);
      expect(city.tagName).toBe("INPUT");
    });

    it("debe permitir dar de alta sin catálogo, para no bloquear al usuario", async () => {
      mockOnSubmit.mockResolvedValueOnce({});
      render(<CustomerForm {...defaultProps} cities={[]} />);

      await fillValidBase();
      await userEvent.type(screen.getByLabelText(/Ciudad/i), "Trinidad");
      await submit();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ city: "Trinidad" })
        );
      });
    });
  });

  describe("Código postal derivado de la ciudad", () => {
    it("debe mostrar el prefijo de la ciudad elegida sin pedir que se teclee", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.selectOptions(screen.getByLabelText(/Ciudad/i), "La Paz");

      expect(screen.getByText(/El prefijo LP lo pone la ciudad elegida/i)).toBeInTheDocument();
    });

    it("debe unir el prefijo con lo que se teclea al enviar", async () => {
      mockOnSubmit.mockResolvedValueOnce({});
      render(<CustomerForm {...defaultProps} />);

      await fillValidBase();
      await userEvent.selectOptions(screen.getByLabelText(/Ciudad/i), "Cochabamba");
      await userEvent.type(screen.getByLabelText(/Código Postal/i), "07");
      await submit();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ city: "Cochabamba", postalCode: "CB-07" })
        );
      });
    });

    it("debe enviar el código postal vacío si no se teclea nada", async () => {
      mockOnSubmit.mockResolvedValueOnce({});
      render(<CustomerForm {...defaultProps} />);

      await fillValidBase();
      await userEvent.selectOptions(screen.getByLabelText(/Ciudad/i), "La Paz");
      await submit();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ postalCode: "" })
        );
      });
    });

    it("debe separar el prefijo al editar, para no duplicarlo", () => {
      const customer = {
        id: 1,
        name: "Juan García",
        email: "juan@example.com",
        phone: "22123456",
        address: "Calle 1",
        city: "La Paz",
        postalCode: "LP-01",
      };
      render(<CustomerForm {...defaultProps} customer={customer} />);

      expect(screen.getByLabelText(/Código Postal/i)).toHaveValue("01");
    });
  });

  describe("Edición", () => {
    it("debe prellenar el formulario con los datos del cliente", () => {
      const customer = {
        id: 1,
        name: "Juan García",
        email: "juan@example.com",
        phone: "22123456",
        address: "Calle 1",
        city: "Cochabamba",
        postalCode: "CB-03",
      };
      render(<CustomerForm {...defaultProps} customer={customer} />);

      expect(screen.getByDisplayValue("Juan García")).toBeInTheDocument();
      expect(screen.getByDisplayValue("juan@example.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("22123456")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Calle 1")).toBeInTheDocument();
      expect(screen.getByLabelText(/Ciudad/i)).toHaveValue("Cochabamba");
    });

    it("debe quitar el código de país de un teléfono guardado antes de la regla", () => {
      const customer = {
        id: 1,
        name: "Heredado",
        email: "heredado@example.com",
        phone: "+591 76543210",
      };
      render(<CustomerForm {...defaultProps} customer={customer} />);

      expect(screen.getByLabelText(/Teléfono/i)).toHaveValue("76543210");
    });
  });

  describe("Validación", () => {
    it("debe validar que el nombre sea requerido", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Email/i), "test@test.com");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "22123456");
      await submit();

      expect(screen.getByText(/el nombre es requerido/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe exigir un nombre de al menos 3 caracteres", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Jo");
      await userEvent.type(screen.getByLabelText(/Email/i), "test@test.com");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "22123456");
      await submit();

      expect(screen.getByText(/al menos 3 caracteres/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe validar que el email sea requerido", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Test Cliente");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "22123456");
      await submit();

      expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe rechazar un email sin dominio, que la API sí aceptaría", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Test Cliente");
      await userEvent.type(screen.getByLabelText(/Email/i), "test@test");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "22123456");
      await submit();

      expect(screen.getByText(/formato válido/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe exigir los 8 dígitos del teléfono", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Test Cliente");
      await userEvent.type(screen.getByLabelText(/Email/i), "test@test.com");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "221234");
      await submit();

      expect(screen.getByText(/debe tener 8 dígitos/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe rechazar un teléfono que empiece en un dígito imposible", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Test Cliente");
      await userEvent.type(screen.getByLabelText(/Email/i), "test@test.com");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "12345678");
      await submit();

      expect(screen.getByText(/debe empezar en 2, 3 o 4/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("debe mostrar el error al salir del campo, sin esperar al envío", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.click(screen.getByLabelText(/Nombre/i));
      await userEvent.tab();

      expect(screen.getByText(/el nombre es requerido/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("no debe mostrar errores antes de tocar los campos", () => {
      render(<CustomerForm {...defaultProps} />);
      expect(screen.queryByText(/el nombre es requerido/i)).not.toBeInTheDocument();
    });

    it("debe limpiar el error del campo cuando el usuario escribe", async () => {
      render(<CustomerForm {...defaultProps} />);

      await submit();
      expect(screen.getByText(/el nombre es requerido/i)).toBeInTheDocument();

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Test Cliente");
      expect(screen.queryByText(/el nombre es requerido/i)).not.toBeInTheDocument();
    });

    it("debe llevar el foco al primer campo inválido según el orden visual", async () => {
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Test Cliente");
      await submit();

      expect(screen.getByLabelText(/Email/i)).toHaveFocus();
    });

    it("debe marcar el campo inválido para los lectores de pantalla", async () => {
      render(<CustomerForm {...defaultProps} />);

      await submit();

      expect(screen.getByLabelText(/Nombre/i)).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("Envío", () => {
    it("debe enviar los datos recortados al onSubmit", async () => {
      mockOnSubmit.mockResolvedValueOnce({});
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "  Test Customer  ");
      await userEvent.type(screen.getByLabelText(/Email/i), "test@example.com");
      await userEvent.type(screen.getByLabelText(/Teléfono/i), "22123456");
      await submit();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Test Customer",
            email: "test@example.com",
            phone: "22123456",
          })
        );
      });
    });

    it("debe normalizar un teléfono pegado con código de país y separadores", async () => {
      mockOnSubmit.mockResolvedValueOnce({});
      render(<CustomerForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/Nombre/i), "Test Cliente");
      await userEvent.type(screen.getByLabelText(/Email/i), "test@example.com");
      // fireEvent en vez de userEvent.paste: este jsdom no implementa el
      // portapapeles, y lo que importa es que el valor pegado entre por
      // handleChange, que es donde se normaliza.
      fireEvent.change(screen.getByLabelText(/Teléfono/i), {
        target: { value: "+591 7-654-3210" },
      });
      await submit();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ phone: "76543210" })
        );
      });
    });

    it("debe cerrar el modal después de guardar correctamente", async () => {
      mockOnSubmit.mockResolvedValueOnce({});
      render(<CustomerForm {...defaultProps} />);

      await fillValidBase();
      await submit();

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("debe mostrar el error inline cuando onSubmit falla", async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error("Create failed"));
      render(<CustomerForm {...defaultProps} />);

      await fillValidBase();
      await submit();

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
