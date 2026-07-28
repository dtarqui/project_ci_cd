import React from "react";
import { render, screen } from "@testing-library/react";
import EmptyState from "../components/ui/EmptyState";

describe("Componente EmptyState", () => {
  it("debe renderizar el icono por defecto cuando no se provee uno", () => {
    const { container } = render(<EmptyState description="Nada por aquí" />);
    expect(container.querySelector(".ui-empty-state-icon svg")).toBeInTheDocument();
  });

  it("debe renderizar título y descripción cuando se proveen", () => {
    render(<EmptyState title="Sin resultados" description="Intenta otra búsqueda" />);
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    expect(screen.getByText("Intenta otra búsqueda")).toBeInTheDocument();
  });

  it("no debe renderizar título ni descripción cuando no se proveen", () => {
    const { container } = render(<EmptyState />);
    expect(container.querySelector(".ui-empty-state-title")).toBeNull();
    expect(container.querySelector(".ui-empty-state-description")).toBeNull();
  });

  it("debe renderizar la acción provista", () => {
    render(<EmptyState action={<button>Crear</button>} />);
    expect(screen.getByRole("button", { name: "Crear" })).toBeInTheDocument();
  });

  it("debe renderizar children adicionales", () => {
    render(
      <EmptyState>
        <span>Extra</span>
      </EmptyState>
    );
    expect(screen.getByText("Extra")).toBeInTheDocument();
  });
});
