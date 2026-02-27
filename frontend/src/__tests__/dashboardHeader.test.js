import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardHeader from "../components/DashboardHeader";

describe("DashboardHeader Component", () => {
  const mockUser = { id: 1, name: "Juan Pérez", username: "jperez" };
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe renderizar el header", () => {
    render(<DashboardHeader user={mockUser} onLogout={mockOnLogout} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
  });

  it("debe mostrar el nombre del usuario cuando se abre el menú", async () => {
    const user = userEvent.setup();
    render(<DashboardHeader user={mockUser} onLogout={mockOnLogout} />);
    
    const accountButton = screen.getByRole("button", { name: /abrir menú de cuenta/i });
    await user.click(accountButton);
    
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
  });

  it("debe mostrar botón de cuenta de usuario", () => {
    render(<DashboardHeader user={mockUser} onLogout={mockOnLogout} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("debe toggle el menú de usuario al hacer click", async () => {
    const user = userEvent.setup();
    render(<DashboardHeader user={mockUser} onLogout={mockOnLogout} />);
    
    const accountButton = screen.getByRole("button", { name: /abrir menú de cuenta/i });
    
    // Click para abrir
    await user.click(accountButton);
    expect(screen.getByText("Salir")).toBeInTheDocument();
    
    // Click para cerrar
    await user.click(accountButton);
    expect(screen.queryByText("Salir")).not.toBeInTheDocument();
  });

  it("debe llamar onLogout al hacer click en Salir", async () => {
    const user = userEvent.setup();
    render(<DashboardHeader user={mockUser} onLogout={mockOnLogout} />);
    
    const accountButton = screen.getByRole("button", { name: /abrir menú de cuenta/i });
    await user.click(accountButton);
    
    const logoutButton = screen.getByText("Salir");
    await user.click(logoutButton);
    
    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });

  it("debe renderizar sin usuario", () => {
    render(<DashboardHeader onLogout={mockOnLogout} />);
    expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
  });
});
