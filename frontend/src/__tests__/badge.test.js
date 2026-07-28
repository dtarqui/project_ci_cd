import React from "react";
import { render, screen } from "@testing-library/react";
import Badge from "../components/ui/Badge";

describe("Componente Badge", () => {
  it("debe renderizar los children", () => {
    render(<Badge>Activo</Badge>);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("debe usar tone neutral por defecto", () => {
    render(<Badge>Estado</Badge>);
    expect(screen.getByText("Estado").className).toContain("ui-badge-neutral");
  });

  it("debe aplicar el tone indicado", () => {
    render(<Badge tone="success">En Stock</Badge>);
    expect(screen.getByText("En Stock").className).toContain("ui-badge-success");
  });

  it("debe mantener la clase status-badge por compatibilidad", () => {
    render(<Badge tone="danger">Sin Stock</Badge>);
    expect(screen.getByText("Sin Stock").className).toContain("status-badge");
  });

  it("debe aplicar className adicional", () => {
    render(
      <Badge tone="warning" className="extra-class">
        Pendiente
      </Badge>
    );
    expect(screen.getByText("Pendiente").className).toContain("extra-class");
  });
});
