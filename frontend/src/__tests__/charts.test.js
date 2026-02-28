import React from "react";
import { render, screen } from "@testing-library/react";
import {
  ProductSalesChart,
  DailySalesChart,
  BranchSalesChart,
  MonthlyTrendChart,
  TopProductsChart,
  CategoryChart
} from "../components/Charts";

describe("Componentes de gráficos", () => {
  const mockProductSales = [
    { product: "Producto A", quantity: 45 },
    { product: "Producto B", quantity: 30 }
  ];

  const mockDailySales = [
    { day: "Lunes", sales: 1200 },
    { day: "Martes", sales: 1500 }
  ];

  const mockBranchSales = [
    { name: "Sucursal Centro", value: 35 },
    { name: "Sucursal Norte", value: 25 }
  ];

  const mockMonthlyTrend = [
    { month: "Enero", sales: 120, revenue: 12000 },
    { month: "Febrero", sales: 150, revenue: 15000 }
  ];

  const mockTopProducts = [
    { name: "Producto A", sales: 100, revenue: 5000, trend: "+5%" },
    { name: "Producto B", sales: 80, revenue: 4000, trend: "-2%" }
  ];

  const mockCategoryData = [
    { name: "Categoría A", value: 40 },
    { name: "Categoría B", value: 30 }
  ];

  it("debe renderizar ProductSalesChart", () => {
    render(<ProductSalesChart data={mockProductSales} />);
    expect(screen.getByText("Productos vendidos")).toBeInTheDocument();
  });

  it("debe renderizar DailySalesChart", () => {
    render(<DailySalesChart data={mockDailySales} />);
    expect(screen.getByText("Ventas en día")).toBeInTheDocument();
  });

  it("debe renderizar BranchSalesChart", () => {
    render(<BranchSalesChart data={mockBranchSales} />);
    expect(screen.getByText("Ventas por sucursal")).toBeInTheDocument();
  });

  it("debe renderizar MonthlyTrendChart", () => {
    render(<MonthlyTrendChart data={mockMonthlyTrend} />);
    expect(screen.getByText("Tendencia de Ventas Mensuales")).toBeInTheDocument();
  });

  it("debe renderizar TopProductsChart", () => {
    render(<TopProductsChart data={mockTopProducts} />);
    expect(screen.getByText("Top 5 Productos")).toBeInTheDocument();
  });

  it("debe renderizar CategoryChart", () => {
    render(<CategoryChart data={mockCategoryData} />);
    expect(screen.getByText("Distribución por Categoría")).toBeInTheDocument();
  });

  it("debe manejar datos vacíos en ProductSalesChart", () => {
    render(<ProductSalesChart data={[]} />);
    expect(screen.getByText("Productos vendidos")).toBeInTheDocument();
  });

  it("debe manejar datos vacíos en BranchSalesChart", () => {
    render(<BranchSalesChart data={[]} />);
    expect(screen.getByText("Ventas por sucursal")).toBeInTheDocument();
  });

  it("debe usar fallbackData en CategoryChart cuando data es undefined", () => {
    const fallback = [{ name: "Fallback", value: 50 }];
    render(<CategoryChart data={undefined} fallbackData={fallback} />);
    expect(screen.getByText("Distribución por Categoría")).toBeInTheDocument();
  });

  it("debe usar fallbackData en MonthlyTrendChart cuando data es null", () => {
    const fallback = [{ month: "Default", sales: 100, revenue: 10000 }];
    render(<MonthlyTrendChart data={null} fallbackData={fallback} />);
    expect(screen.getByText("Tendencia de Ventas Mensuales")).toBeInTheDocument();
  });

  it("debe manejar datos undefined en TopProductsChart", () => {
    render(<TopProductsChart data={undefined} />);
    expect(screen.getByText("Top 5 Productos")).toBeInTheDocument();
  });

  it("debe renderizar productos con trend positivo y negativo", () => {
    const mixedTrends = [
      { name: "Producto Positivo", sales: 100, revenue: 5000, trend: "+10%" },
      { name: "Producto Negativo", sales: 50, revenue: 2000, trend: "-5%" }
    ];
    const { container } = render(<TopProductsChart data={mixedTrends} />);
    expect(container.querySelector(".product-trend.positive")).toBeInTheDocument();
    expect(container.querySelector(".product-trend.negative")).toBeInTheDocument();
  });

  it("debe renderizar BranchSalesChart con data null", () => {
    render(<BranchSalesChart data={null} />);
    expect(screen.getByText("Ventas por sucursal")).toBeInTheDocument();
  });
});
