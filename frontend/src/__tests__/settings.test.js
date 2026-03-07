import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Settings from "../components/Settings";
import { userService } from "../services/api";

jest.mock("../services/api", () => ({
  userService: {
    getMyProfile: jest.fn(),
    updateMyProfile: jest.fn(),
  },
}));

const mockProfileUser = {
  id: 2,
  name: "Usuario Demo",
  email: "demo@email.com",
  username: "demo",
  phone: "+591 70000001",
  address: "Santa Cruz",
  city: "Santa Cruz",
  state: "Santa Cruz",
  country: "Bolivia",
  postalCode: "SC-01",
  dateOfBirth: "1990-10-15",
};

const mockProfileResponse = { user: mockProfileUser };

describe("Componente Settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userService.getMyProfile.mockResolvedValue(mockProfileResponse);
    userService.updateMyProfile.mockResolvedValue(mockProfileResponse);
  });

  test("debe renderizar el encabezado y la información de perfil por defecto", async () => {
    render(<Settings />);

    expect(screen.getByRole("heading", { level: 1, name: "Perfil" })).toBeInTheDocument();
    expect(screen.getByText(/Administra tu información personal/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Usuario Demo")).toBeInTheDocument();
    });

    expect(screen.getByText(/Información de Perfil/)).toBeInTheDocument();
  });

  test("debe entrar en modo edición y guardar el perfil", async () => {
    userService.updateMyProfile.mockResolvedValue({
      user: {
        ...mockProfileUser,
        name: "Nombre Actualizado",
      },
    });

    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByText("Usuario Demo")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    const nameInput = await screen.findByDisplayValue("Usuario Demo");

    fireEvent.change(nameInput, { target: { value: "Nombre Actualizado" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar Cambios/ }));

    await waitFor(() => {
      expect(userService.updateMyProfile).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Perfil guardado correctamente/)).toBeInTheDocument();
      expect(screen.getByText("Nombre Actualizado")).toBeInTheDocument();
    });
  });

  test("debe cancelar la edición del perfil y restaurar valores originales", async () => {
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByText("Usuario Demo")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    const nameInput = await screen.findByDisplayValue("Usuario Demo");

    fireEvent.change(nameInput, { target: { value: "Nombre Temporal" } });
    fireEvent.click(screen.getByRole("button", { name: /Cancelar/ }));

    await waitFor(() => {
      expect(screen.getByText("Usuario Demo")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("Nombre Temporal")).toBeNull();
    });
  });

  test("debe mostrar error cuando falla la carga del perfil", async () => {
    userService.getMyProfile.mockRejectedValueOnce({
      response: { data: { error: "No se pudo cargar tu perfil" } },
    });

    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByText(/No se pudo cargar tu perfil/)).toBeInTheDocument();
    });
  });

  test("debe mostrar error cuando falla el guardado del perfil", async () => {
    userService.updateMyProfile.mockRejectedValueOnce({
      response: { data: { error: "No se pudo guardar el perfil" } },
    });

    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByText("Usuario Demo")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    fireEvent.click(screen.getByRole("button", { name: /Guardar Cambios/ }));

    await waitFor(() => {
      expect(screen.getByText(/No se pudo guardar el perfil/)).toBeInTheDocument();
    });
  });
});
