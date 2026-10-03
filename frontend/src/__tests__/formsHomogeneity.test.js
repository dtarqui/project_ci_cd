/**
 * Los tres formularios tienen que verse y comportarse igual.
 *
 * Existe porque habían derivado: el de ventas mostraba la validación en un aviso
 * arriba mientras los otros dos la mostraban bajo cada campo, el de clientes
 * titulaba con `h3` y los otros con `h2`, dos cerraban con el carácter `×` y el
 * tercero con un icono, y había ocho nombres de clase propios de cada formulario
 * que ninguna hoja de estilos definía. Nada de eso lo detectaban las pruebas de
 * cada formulario por separado, que solo miraban su propio componente.
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProductForm from "../components/ProductForm";
import CustomerForm from "../components/CustomerForm";
import SalesForm from "../components/SalesForm";

const formularios = [
  {
    nombre: "ProductForm",
    titulo: "Crear Nuevo Producto",
    crear: (props = {}) => (
      <ProductForm
        isOpen
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        categories={["Electrónica"]}
        {...props}
      />
    ),
  },
  {
    nombre: "CustomerForm",
    titulo: "Nuevo Cliente",
    crear: (props = {}) => (
      <CustomerForm isOpen onClose={jest.fn()} onSubmit={jest.fn()} {...props} />
    ),
  },
  {
    nombre: "SalesForm",
    titulo: "Nueva Venta",
    crear: (props = {}) => (
      <SalesForm
        isOpen
        onClose={jest.fn()}
        onSave={jest.fn()}
        customers={[{ id: 1, name: "Cliente A" }]}
        products={[{ id: 1, name: "Producto A", price: 100, stock: 5 }]}
        cities={[]}
        loading={false}
        error=""
        {...props}
      />
    ),
  },
];

describe("Los tres formularios comparten el mismo diálogo", () => {
  describe.each(formularios)("$nombre", ({ titulo, crear }) => {
    it("usa las clases compartidas del diálogo y ninguna propia", () => {
      const { container } = render(crear());

      [
        ".form-modal-overlay",
        ".form-modal",
        ".form-modal-header",
        ".form-modal-title",
        ".form-modal-close",
        ".form-modal-body",
        ".form-modal-actions",
      ].forEach((clase) => {
        expect(container.querySelector(clase)).toBeInTheDocument();
      });

      // Las clases que cada formulario traía por su cuenta y que ninguna hoja
      // llegaba a definir.
      const huerfanas = container.querySelectorAll(
        [
          "[class*='sales-form-field']",
          "[class*='sales-form-row']",
          "[class*='sales-form-error']",
          "[class*='customer-form-overlay']",
          "[class*='customer-form-modal']",
        ].join(",")
      );
      expect(huerfanas).toHaveLength(0);
    });

    it("titula con h2 dentro de la cabecera", () => {
      render(crear());

      const encabezado = screen.getByRole("heading", { name: titulo });
      expect(encabezado.tagName).toBe("H2");
      expect(encabezado).toHaveClass("form-modal-title");
    });

    it("se anuncia como diálogo y toma su nombre del título", () => {
      const { container } = render(crear());

      const dialogo = container.querySelector(".form-modal-overlay");
      expect(dialogo).toHaveAttribute("role", "dialog");
      expect(dialogo).toHaveAttribute("aria-modal", "true");

      const id = dialogo.getAttribute("aria-labelledby");
      expect(document.getElementById(id)).toHaveTextContent(titulo);
    });

    it("cierra con el mismo botón y con el mismo nombre accesible", () => {
      const onClose = jest.fn();
      const { container } = render(
        // SalesForm recibe el cierre por `onClose` igual que los otros dos.
        crear({ onClose })
      );

      const cerrar = within(
        container.querySelector(".form-modal-header")
      ).getByRole("button", { name: "Cerrar formulario" });
      // Un icono, no el carácter `×`: antes convivían los dos.
      expect(cerrar.querySelector("svg")).toBeInTheDocument();

      fireEvent.click(cerrar);
      expect(onClose).toHaveBeenCalled();
    });

    it("cierra al pulsar fuera del panel", () => {
      const onClose = jest.fn();
      const { container } = render(crear({ onClose }));

      fireEvent.click(container.querySelector(".form-modal-overlay"));
      expect(onClose).toHaveBeenCalled();
    });

    it("no cierra al pulsar dentro del panel", () => {
      const onClose = jest.fn();
      const { container } = render(crear({ onClose }));

      fireEvent.click(container.querySelector(".form-modal-body"));
      expect(onClose).not.toHaveBeenCalled();
    });

    it("pone la acción principal primero y cancelar después", () => {
      const { container } = render(crear());

      const botones = within(
        container.querySelector(".form-modal-actions")
      ).getAllByRole("button");
      expect(botones).toHaveLength(2);
      expect(botones[0]).toHaveAttribute("type", "submit");
      expect(botones[1]).toHaveTextContent(/cancelar/i);
    });

    it("acomoda los campos en filas de dos columnas", () => {
      const { container } = render(crear());
      expect(
        container.querySelectorAll(".form-field-row").length
      ).toBeGreaterThan(0);
    });
  });

  it("marca con asterisco todo campo cuya ausencia rechaza el formulario", () => {
    formularios.forEach(({ crear }) => {
      const { container, unmount } = render(crear());

      container.querySelectorAll(".form-field label").forEach((label) => {
        const control = container.querySelector(`#${label.htmlFor}`);
        if (control && control.required) {
          expect(label.textContent).toMatch(/\*$/);
        }
      });

      unmount();
    });
  });
});

describe("Los tres formularios señalan los errores igual", () => {
  it("muestra el problema de un campo debajo de ese campo, con su icono", async () => {
    const casos = [
      {
        crear: formularios[0].crear,
        // Enviar vacío: el nombre es obligatorio.
        enviar: (container) => fireEvent.submit(container.querySelector("form")),
      },
      {
        crear: formularios[1].crear,
        enviar: (container) => fireEvent.submit(container.querySelector("form")),
      },
      {
        crear: formularios[2].crear,
        enviar: (container) => fireEvent.submit(container.querySelector("form")),
      },
    ];

    for (const { crear, enviar } of casos) {
      const { container, unmount } = render(crear());
      enviar(container);

      const errores = await screen.findAllByRole("alert");
      expect(errores.length).toBeGreaterThan(0);
      errores.forEach((error) => {
        expect(error).toHaveClass("field-error");
        // El mismo icono en los tres.
        expect(error.querySelector("svg")).toBeInTheDocument();
      });
      // Y el campo queda marcado como inválido, no solo el texto.
      expect(container.querySelector('[aria-invalid="true"]')).toBeInTheDocument();

      unmount();
    }
  });

  it("reserva el aviso de la cabecera para los fallos que no son de un campo", () => {
    const { container } = render(
      formularios[2].crear({
        error: "No se pudo guardar la venta.",
      })
    );

    const aviso = container.querySelector(".form-modal-alert");
    expect(aviso).toHaveTextContent("No se pudo guardar la venta.");
    // Un fallo al guardar no ensucia ningún campo.
    expect(container.querySelector(".field-error")).not.toBeInTheDocument();
  });
});
