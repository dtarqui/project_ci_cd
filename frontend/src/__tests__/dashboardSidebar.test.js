import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardSidebar from "../components/DashboardSidebar";
import { useAuth } from "../context/AuthContext";

jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

describe("Componente DashboardSidebar", () => {
  const mockOnSectionChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { role: "admin" } });
  });

  it("debe renderizar todos los items del menú", () => {
    render(<DashboardSidebar activeSection="Dashboard" onSectionChange={mockOnSectionChange} />);
    
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Ventas")).toBeInTheDocument();
    expect(screen.getByText("Configuraciones")).toBeInTheDocument();
  });

  it("debe marcar como activo el item seleccionado", () => {
    const { container } = render(
      <DashboardSidebar activeSection="Productos" onSectionChange={mockOnSectionChange} />
    );
    
    const buttons = container.querySelectorAll("button");
    const productosButton = Array.from(buttons).find(btn => btn.textContent.includes("Productos"));
    
    expect(productosButton.className).toContain("active");
  });

  it("debe llamar onSectionChange cuando se hace click en un item", async () => {
    const user = userEvent.setup();
    render(<DashboardSidebar activeSection="Dashboard" onSectionChange={mockOnSectionChange} />);
    
    const clientesButton = screen.getByText("Clientes");
    await user.click(clientesButton);
    
    expect(mockOnSectionChange).toHaveBeenCalledWith("Clientes");
  });

  it("debe renderizar iconos para cada sección", () => {
    const { container } = render(
      <DashboardSidebar activeSection="Dashboard" onSectionChange={mockOnSectionChange} />
    );
    
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });
  // Catálogos es la pantalla de administración de ciudades y categorías. Ocultarla
  // es una comodidad: la barrera real es el 403 del backend.
  it("ofrece Catálogos al administrador", () => {
    useAuth.mockReturnValue({ user: { role: "admin" } });
    render(
      <DashboardSidebar activeSection="Dashboard" onSectionChange={mockOnSectionChange} />
    );

    expect(screen.getByText("Catálogos")).toBeInTheDocument();
  });

  it("no ofrece Catálogos a un vendedor", () => {
    useAuth.mockReturnValue({ user: { role: "vendedor" } });
    render(
      <DashboardSidebar activeSection="Dashboard" onSectionChange={mockOnSectionChange} />
    );

    expect(screen.queryByText("Catálogos")).not.toBeInTheDocument();
    // Las demás secciones siguen estando.
    expect(screen.getByText("Productos")).toBeInTheDocument();
  });

  it("no ofrece Catálogos si no hay sesión resuelta", () => {
    useAuth.mockReturnValue({ user: null });
    render(
      <DashboardSidebar activeSection="Dashboard" onSectionChange={mockOnSectionChange} />
    );

    expect(screen.queryByText("Catálogos")).not.toBeInTheDocument();
  });
});
