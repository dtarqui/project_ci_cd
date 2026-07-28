import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "../components/ui/Modal";

describe("Componente Modal", () => {
  it("no debe renderizar nada cuando isOpen es false", () => {
    const { container } = render(
      <Modal isOpen={false} onClose={jest.fn()}>
        <p>Contenido</p>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it("debe renderizar los children cuando isOpen es true", () => {
    render(
      <Modal isOpen onClose={jest.fn()}>
        <p>Contenido del modal</p>
      </Modal>
    );
    expect(screen.getByText("Contenido del modal")).toBeInTheDocument();
  });

  it("debe llamar onClose al hacer clic en el overlay", async () => {
    const handleClose = jest.fn();
    const { container } = render(
      <Modal isOpen onClose={handleClose}>
        <p>Contenido</p>
      </Modal>
    );

    await userEvent.click(container.querySelector(".ui-modal-overlay"));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("no debe llamar onClose al hacer clic dentro del panel", async () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen onClose={handleClose}>
        <p>Contenido interno</p>
      </Modal>
    );

    await userEvent.click(screen.getByText("Contenido interno"));

    expect(handleClose).not.toHaveBeenCalled();
  });

  it("debe aplicar maxWidth por defecto y className adicional", () => {
    const { container } = render(
      <Modal isOpen onClose={jest.fn()} className="mi-modal">
        <p>Contenido</p>
      </Modal>
    );

    const panel = container.querySelector(".ui-modal");
    expect(panel.className).toContain("mi-modal");
    expect(panel.style.maxWidth).toBe("420px");
  });
});
