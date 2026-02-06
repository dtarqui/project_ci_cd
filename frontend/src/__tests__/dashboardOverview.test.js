import React from "react";
import { render, screen } from "@testing-library/react";
import DashboardOverview from "../components/DashboardOverview";

// Mock de los componentes de Charts
jest.mock("../components/Charts", () => ({
  ProductSalesChart: ({ data }) => <div>ProductSalesChart: {data?.length || 0} items</div>,
  DailySalesChart: ({ data }) => <div>DailySalesChart: {data?.length || 0} items</div>,
  BranchSalesChart: ({ data }) => <div>BranchSalesChart: {data?.length || 0} items</div>,
  CategoryChart: ({ data }) => <div>CategoryChart: {data?.length || 0} items</div>,
  MonthlyTrendChart: ({ data }) => <div>MonthlyTrendChart: {data?.length || 0} items</div>,
  TopProductsChart: ({ data }) => <div>TopProductsChart: {data?.length || 0} items</div>,
}));

describe("DashboardOverview Component", () => {
  const mockData = {
    salesTrend: [
      { day: "Lunes", sales: 1200 },
      { day: "Martes", sales: 1500 }
    ],
    productSales: [
      { product: "Producto A", quantity: 45 },
      { product: "Producto B", quantity: 30 }
    ],
    branchSales: [
      { name: "Sucursal Centro", value: 35 },
      { name: "Sucursal Norte", value: 25 }
    ]
  };

  it("debe renderizar el componente", () => {
    const { container } = render(<DashboardOverview data={mockData} />);
    expect(container.querySelector(".dashboard-overview")).toBeInTheDocument();
  });

  it("debe renderizar ProductSalesChart", () => {
    render(<DashboardOverview data={mockData} />);
    expect(screen.getByText(/ProductSalesChart/)).toBeInTheDocument();
  });

  it("debe renderizar DailySalesChart", () => {
    render(<DashboardOverview data={mockData} />);
    expect(screen.getByText(/DailySalesChart/)).toBeInTheDocument();
  });

  it("debe renderizar BranchSalesChart", () => {
    render(<DashboardOverview data={mockData} />);
    expect(screen.getByText(/BranchSalesChart/)).toBeInTheDocument();
  });

  it("debe manejar datos vacíos correctamente", () => {
    const { container } = render(<DashboardOverview data={{}} />);
    expect(container.querySelector(".dashboard-overview")).toBeInTheDocument();
  });
});
