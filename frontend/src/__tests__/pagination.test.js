import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "../components/ui/Pagination";

describe("Componente Pagination", () => {
  const baseProps = {
    page: 2,
    totalPages: 3,
    total: 25,
    pageSize: 10,
    onPageChange: jest.fn(),
  };

  it("no debe renderizar nada cuando solo hay una pagina", () => {
    const { container } = render(<Pagination {...baseProps} totalPages={1} />);
    expect(container.firstChild).toBeNull();
  });

  it("no debe renderizar nada cuando totalPages es cero", () => {
    const { container } = render(<Pagination {...baseProps} totalPages={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("debe mostrar el rango de resultados de la pagina actual", () => {
    const { container } = render(<Pagination {...baseProps} />);
    expect(container.querySelector(".ui-pagination-summary").textContent).toBe("11-20 de 25");
  });

  it("debe recortar el final del rango en la ultima pagina", () => {
    const { container } = render(<Pagination {...baseProps} page={3} />);
    expect(container.querySelector(".ui-pagination-summary").textContent).toBe("21-25 de 25");
  });

  it("debe mostrar 0 como inicio del rango cuando no hay resultados", () => {
    // Combinacion defensiva: total 0 con mas de una pagina no se da en la UI,
    // pero el componente contempla el caso para no mostrar "1-0 de 0".
    const { container } = render(<Pagination {...baseProps} page={1} total={0} />);
    expect(container.querySelector(".ui-pagination-summary").textContent).toBe("0-0 de 0");
  });

  it("debe indicar la pagina actual y el total de paginas", () => {
    const { container } = render(<Pagination {...baseProps} />);
    expect(container.querySelector(".ui-pagination-page").textContent).toBe("Página 2 de 3");
  });

  it("debe deshabilitar Anterior en la primera pagina", () => {
    render(<Pagination {...baseProps} page={1} />);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();
  });

  it("debe deshabilitar Siguiente en la ultima pagina", () => {
    render(<Pagination {...baseProps} page={3} />);
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
  });

  it("debe pedir la pagina anterior al hacer clic en Anterior", async () => {
    const onPageChange = jest.fn();
    render(<Pagination {...baseProps} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Anterior" }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("debe pedir la pagina siguiente al hacer clic en Siguiente", async () => {
    const onPageChange = jest.fn();
    render(<Pagination {...baseProps} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
