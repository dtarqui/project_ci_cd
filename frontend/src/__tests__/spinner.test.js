import React from "react";
import { render, screen } from "@testing-library/react";
import Spinner from "../components/ui/Spinner";

describe("Componente Spinner", () => {
  it("debe renderizar con tamaño md por defecto", () => {
    render(<Spinner />);
    const el = screen.getByRole("status");
    expect(el.style.width).toBe("24px");
    expect(el.style.height).toBe("24px");
  });

  it("debe aplicar el tamaño sm", () => {
    render(<Spinner size="sm" />);
    const el = screen.getByRole("status");
    expect(el.style.width).toBe("16px");
  });

  it("debe aplicar el tamaño lg", () => {
    render(<Spinner size="lg" />);
    const el = screen.getByRole("status");
    expect(el.style.width).toBe("40px");
  });

  it("debe aplicar className adicional", () => {
    render(<Spinner className="extra" />);
    expect(screen.getByRole("status").className).toContain("extra");
  });

  it("debe tener aria-label de accesibilidad", () => {
    render(<Spinner />);
    expect(screen.getByLabelText("Cargando")).toBeInTheDocument();
  });
});
