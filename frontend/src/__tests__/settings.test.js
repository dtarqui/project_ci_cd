import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Settings from "../components/Settings";

describe("Settings Component", () => {
  test("renders header and default profile tab", () => {
    render(<Settings />);

    expect(screen.getByText(/Configuraciones/)).toBeInTheDocument();
    expect(
      screen.getByText(/Administra tu perfil, preferencias y configuración de seguridad/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Información de Perfil/)).toBeInTheDocument();
  });

  test("enters edit mode and saves profile", async () => {
    render(<Settings />);

    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    const nameInput = screen.getByDisplayValue("Usuario Demo");

    fireEvent.change(nameInput, { target: { value: "Nombre Actualizado" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar Cambios/ }));

    await waitFor(() => {
      expect(screen.getByText(/Perfil guardado correctamente/)).toBeInTheDocument();
    });
  });

  test("cancels profile edit and restores original values", async () => {
    render(<Settings />);

    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    const nameInput = screen.getByDisplayValue("Usuario Demo");

    fireEvent.change(nameInput, { target: { value: "Nombre Temporal" } });
    fireEvent.click(screen.getByRole("button", { name: /Cancelar/ }));

    await waitFor(() => {
      expect(screen.getByText("Usuario Demo")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("Nombre Temporal")).toBeNull();
    });
  });

  test("opens notifications tab and toggles email notifications", async () => {
    render(<Settings />);

    fireEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));

    const emailToggle = screen.getByLabelText(/Notificaciones por Email/);
    expect(emailToggle).toBeChecked();

    fireEvent.click(emailToggle);

    await waitFor(() => {
      expect(emailToggle).not.toBeChecked();
      expect(screen.getByText(/Preferencias actualizadas/)).toBeInTheDocument();
    });
  });

  test("shows validation errors and success on password change", async () => {
    render(<Settings />);

    fireEvent.click(screen.getByRole("button", { name: /Seguridad/ }));
    fireEvent.click(screen.getByRole("button", { name: /Actualizar Contraseña/ }));

    await waitFor(() => {
      expect(screen.getByText(/Todos los campos son requeridos/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/contraseña actual/i), {
      target: { value: "actual123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ingresa tu nueva contraseña/), {
      target: { value: "nueva123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirma tu nueva contraseña/), {
      target: { value: "diferente" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Actualizar Contraseña/ }));

    await waitFor(() => {
      expect(screen.getByText(/Las contraseñas no coinciden/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Ingresa tu nueva contraseña/), {
      target: { value: "abc" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirma tu nueva contraseña/), {
      target: { value: "abc" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Actualizar Contraseña/ }));

    await waitFor(() => {
      expect(
        screen.getByText(/La contraseña debe tener al menos 6 caracteres/)
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Ingresa tu nueva contraseña/), {
      target: { value: "nueva123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirma tu nueva contraseña/), {
      target: { value: "nueva123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Actualizar Contraseña/ }));

    await waitFor(() => {
      expect(
        screen.getByText(/Contraseña actualizada correctamente/)
      ).toBeInTheDocument();
    });
  });

  test("updates preferences and shows info tab", async () => {
    render(<Settings />);

    fireEvent.click(screen.getByRole("button", { name: /Preferencias/ }));

    const languageSelect = screen.getByLabelText(/Idioma/);
    fireEvent.change(languageSelect, { target: { value: "en" } });

    await waitFor(() => {
      expect(languageSelect.value).toBe("en");
      expect(screen.getByText(/Preferencias guardadas/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Información/ }));

    await waitFor(() => {
      expect(screen.getByText(/Versión de la Aplicación/)).toBeInTheDocument();
    });
  });

  test("shows support links in info tab", async () => {
    render(<Settings />);

    fireEvent.click(screen.getByRole("button", { name: /Información/ }));

    await waitFor(() => {
      expect(screen.getByText(/Documentación/)).toBeInTheDocument();
      expect(screen.getByText(/Contactar Soporte/)).toBeInTheDocument();
    });
  });
});
