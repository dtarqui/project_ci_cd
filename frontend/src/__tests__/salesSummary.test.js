import React from "react";
import { render, screen } from "@testing-library/react";
import SalesSummary from "../components/SalesSummary";

describe("SalesSummary Component", () => {
  const mockData = {
    dailySales: "$5,234",
    totalOrders: 234,
    activeCustomers: 45,
    averageTicket: "22.35"
  };

  it("debe renderizar el componente", () => {
    const { container } = render(<SalesSummary data={mockData} />);
    expect(container.querySelector(".sales-summary")).toBeInTheDocument();
  });

  it("debe mostrar ventas diarias", () => {
    render(<SalesSummary data={mockData} />);
    expect(screen.getByText("$5,234")).toBeInTheDocument();
    expect(screen.getByText("Ventas diarias")).toBeInTheDocument();
  });

  it("debe mostrar todas las métricas", () => {
    const { container } = render(<SalesSummary data={mockData} />);
    const cards = container.querySelectorAll(".summary-card");
    expect(cards.length).toBe(4);
  });

  it("debe manejar datos vacíos correctamente", () => {
    const { container } = render(<SalesSummary data={{}} />);
    expect(container.querySelector(".sales-summary")).toBeInTheDocument();
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThan(0);
  });

  it("debe renderizar ticket promedio", () => {
    render(<SalesSummary data={mockData} />);
    expect(screen.getByText("$22.35")).toBeInTheDocument();
  });
});
