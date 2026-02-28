import React from "react";
import { render, screen } from "@testing-library/react";
import SectionContent from "../components/SectionContent";

jest.mock("../services/api", () => ({
  dashboardService: {
    getProducts: jest.fn(() => Promise.resolve({ data: [] })),
    getCustomers: jest.fn(() => Promise.resolve({ data: [] })),
  },
}));

jest.mock("../components/CustomersSection", () => {
  return function MockCustomersSection() {
    return <div data-testid="customers-section">Customers Section Mock</div>;
  };
});

jest.mock("../components/ProductsSection", () => {
  return function MockProductsSection() {
    return <div data-testid="products-section">Products Section Mock</div>;
  };
});

jest.mock("../components/SalesSection", () => {
  return function MockSalesSection() {
    return <div data-testid="sales-section">Sales Section Mock</div>;
  };
});

describe("Componente SectionContent", () => {
  describe("Renderizado de rutas", () => {
    it("debe renderizar CustomersSection cuando el tipo es 'Clientes'", () => {
      render(<SectionContent type="Clientes" />);
      expect(screen.getByTestId("customers-section")).toBeInTheDocument();
    });

    it("debe renderizar Settings cuando el tipo es 'Configuraciones'", () => {
      render(<SectionContent type="Configuraciones" />);
      expect(screen.getByText(/Configuraciones/)).toBeInTheDocument();
      expect(
        screen.getByText(/Administra tu perfil, preferencias y configuración de seguridad/)
      ).toBeInTheDocument();
    });

    it("debe renderizar ProductsSection cuando el tipo es 'Productos'", () => {
      render(<SectionContent type="Productos" />);
      expect(screen.getByTestId("products-section")).toBeInTheDocument();
    });

    it("debe renderizar SalesSection cuando el tipo es 'Ventas'", () => {
      render(<SectionContent type="Ventas" />);
      expect(screen.getByTestId("sales-section")).toBeInTheDocument();
    });

    it("debe retornar null cuando el tipo es desconocido", () => {
      const { container } = render(<SectionContent type="TipoDesconocido" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Validación de PropTypes", () => {
    it("debe tener propTypes.type definido", () => {
      expect(SectionContent.propTypes.type).toBeDefined();
    });
  });
});
