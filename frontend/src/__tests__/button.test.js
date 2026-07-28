import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "../components/ui/Button";

describe("Componente Button", () => {
  it("debe renderizar los children", () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("debe usar variant y size por defecto", () => {
    render(<Button>Aceptar</Button>);
    const button = screen.getByRole("button", { name: "Aceptar" });
    expect(button.className).toContain("ui-btn-primary");
    expect(button.className).toContain("ui-btn-md");
  });

  it("debe aplicar la variante indicada", () => {
    render(<Button variant="danger">Eliminar</Button>);
    expect(screen.getByRole("button", { name: "Eliminar" }).className).toContain(
      "ui-btn-danger"
    );
  });

  it("debe llamar onClick al hacer clic", async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Click" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("debe deshabilitarse cuando disabled es true", () => {
    render(<Button disabled>Deshabilitado</Button>);
    expect(screen.getByRole("button", { name: "Deshabilitado" })).toBeDisabled();
  });

  it("debe mostrar el spinner y deshabilitarse cuando loading es true", () => {
    const { container } = render(<Button loading>Guardando</Button>);
    expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
    expect(container.querySelector(".ui-btn-spinner")).toBeInTheDocument();
  });

  it("debe renderizar el icono cuando no está en loading", () => {
    render(<Button icon={<span data-testid="icon" />}>Con icono</Button>);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("debe aplicar className adicional", () => {
    render(<Button className="btn-custom">Custom</Button>);
    expect(screen.getByRole("button", { name: "Custom" }).className).toContain(
      "btn-custom"
    );
  });
});
