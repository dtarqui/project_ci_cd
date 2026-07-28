import React from "react";
import { render } from "@testing-library/react";
import Skeleton, { SkeletonTableRows, SkeletonCard } from "../components/ui/Skeleton";

describe("Componente Skeleton", () => {
  it("debe renderizar con las dimensiones por defecto", () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector(".ui-skeleton");
    expect(el).toBeInTheDocument();
    expect(el.style.width).toBe("100%");
    expect(el.style.height).toBe("1em");
  });

  it("debe aceptar width/height/radius personalizados", () => {
    const { container } = render(<Skeleton width="50px" height="10px" radius="4px" />);
    const el = container.querySelector(".ui-skeleton");
    expect(el.style.width).toBe("50px");
    expect(el.style.height).toBe("10px");
    expect(el.style.borderRadius).toBe("4px");
  });
});

describe("SkeletonTableRows", () => {
  it("debe renderizar el número de filas y columnas indicado", () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRows rows={3} columns={4} />
        </tbody>
      </table>
    );

    expect(container.querySelectorAll(".ui-skeleton-row")).toHaveLength(3);
    expect(container.querySelectorAll(".ui-skeleton-row td")).toHaveLength(12);
  });

  it("debe usar 5 filas por defecto", () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRows columns={2} />
        </tbody>
      </table>
    );

    expect(container.querySelectorAll(".ui-skeleton-row")).toHaveLength(5);
  });
});

describe("SkeletonCard", () => {
  it("debe renderizar la tarjeta shimmer", () => {
    const { container } = render(<SkeletonCard />);
    expect(container.querySelector(".ui-skeleton-card")).toBeInTheDocument();
    expect(container.querySelectorAll(".ui-skeleton")).toHaveLength(2);
  });

  it("debe aplicar className adicional", () => {
    const { container } = render(<SkeletonCard className="extra" />);
    expect(container.querySelector(".ui-skeleton-card").className).toContain(
      "extra"
    );
  });
});
