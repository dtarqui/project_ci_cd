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

describe("SectionContent Component", () => {
  describe("Rendering Routes", () => {
    it("should render CustomersSection when type is 'Clientes'", () => {
      render(<SectionContent type="Clientes" />);
      expect(screen.getByTestId("customers-section")).toBeInTheDocument();
    });

    it("should render Settings when type is 'Configuraciones'", () => {
      render(<SectionContent type="Configuraciones" />);
      expect(screen.getByText(/Configuraciones/)).toBeInTheDocument();
      expect(
        screen.getByText(/Administra tu perfil, preferencias y configuración de seguridad/)
      ).toBeInTheDocument();
    });

    it("should return null when type is unknown", () => {
      const { container } = render(<SectionContent type="TipoDesconocido" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("PropTypes Validation", () => {
    it("should have propTypes.type defined", () => {
      expect(SectionContent.propTypes.type).toBeDefined();
    });
  });
});
