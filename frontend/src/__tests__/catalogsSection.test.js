import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import CatalogsSection from "../components/CatalogsSection";
import * as apiService from "../services/api";
import { useAuth } from "../context/AuthContext";

jest.mock("../services/api");
jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

describe("Componente CatalogsSection", () => {
  const ciudades = [
    { id: 1, name: "La Paz", postalPrefix: "LP", areaCode: "22" },
    { id: 2, name: "Cochabamba", postalPrefix: "CB", areaCode: "44" },
  ];
  const categorias = [
    { id: 1, name: "Electrónica", description: null },
    { id: 2, name: "Hogar", description: "Artículos del hogar" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { role: "admin" } });
    apiService.catalogService.list.mockImplementation((recurso) =>
      Promise.resolve({ data: recurso === "cities" ? ciudades : categorias })
    );
    apiService.handleApiError.mockImplementation(() => "Error de prueba");
  });

  describe("Acceso", () => {
    // La barrera real es el 403 del backend; esto evita ofrecer una pantalla que
    // no se va a poder usar.
    it("no muestra los catálogos a un vendedor", () => {
      useAuth.mockReturnValue({ user: { role: "vendedor" } });
      render(<CatalogsSection />);

      expect(screen.getByText("Solo para administradores")).toBeInTheDocument();
      expect(apiService.catalogService.list).not.toHaveBeenCalled();
    });

    it("carga el catálogo para el administrador", async () => {
      render(<CatalogsSection />);

      await waitFor(() => {
        expect(screen.getByText("La Paz")).toBeInTheDocument();
      });
      expect(apiService.catalogService.list).toHaveBeenCalledWith("cities");
    });
  });

  describe("Pestañas", () => {
    it("cambia de ciudades a categorías", async () => {
      const user = userEvent.setup();
      render(<CatalogsSection />);

      await waitFor(() => expect(screen.getByText("La Paz")).toBeInTheDocument());

      await user.click(screen.getByRole("tab", { name: "Categorías" }));

      await waitFor(() => {
        expect(screen.getByText("Electrónica")).toBeInTheDocument();
      });
      expect(apiService.catalogService.list).toHaveBeenCalledWith("categories");
    });

    it("las columnas corresponden al catálogo activo", async () => {
      const user = userEvent.setup();
      const { container } = render(<CatalogsSection />);

      await waitFor(() => expect(screen.getByText("La Paz")).toBeInTheDocument());
      let encabezados = Array.from(container.querySelectorAll("thead th")).map(
        (th) => th.textContent
      );
      expect(encabezados).toEqual(["Nombre", "Prefijo postal", "Código de área", "Acciones"]);

      await user.click(screen.getByRole("tab", { name: "Categorías" }));

      await waitFor(() => {
        encabezados = Array.from(container.querySelectorAll("thead th")).map(
          (th) => th.textContent
        );
        expect(encabezados).toEqual(["Nombre", "Descripción", "Acciones"]);
      });
    });
  });

  describe("Alta", () => {
    it("crea una ciudad y recarga el listado", async () => {
      const user = userEvent.setup();
      apiService.catalogService.create.mockResolvedValue({ data: { id: 3 } });
      render(<CatalogsSection />);

      await waitFor(() => expect(screen.getByText("La Paz")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: /nueva ciudad/i }));
      await user.type(screen.getByLabelText(/^Nombre/), "Trinidad");
      await user.type(screen.getByLabelText(/Prefijo postal/), "TR");
      await user.click(screen.getByRole("button", { name: "Crear" }));

      await waitFor(() => {
        expect(apiService.catalogService.create).toHaveBeenCalledWith("cities", {
          name: "Trinidad",
          postalPrefix: "TR",
          areaCode: null,
        });
      });
      // Se vuelve a pedir el listado para reflejar el alta.
      expect(apiService.catalogService.list).toHaveBeenCalledTimes(2);
    });

    it("exige el nombre antes de enviar", async () => {
      const user = userEvent.setup();
      render(<CatalogsSection />);

      await waitFor(() => expect(screen.getByText("La Paz")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: /nueva ciudad/i }));
      await user.click(screen.getByRole("button", { name: "Crear" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Nombre es requerido");
      expect(apiService.catalogService.create).not.toHaveBeenCalled();
    });

    it("muestra el motivo cuando el backend rechaza el alta", async () => {
      const user = userEvent.setup();
      apiService.catalogService.create.mockRejectedValue(new Error("409"));
      apiService.handleApiError.mockReturnValue("La ciudad ya existe");
      render(<CatalogsSection />);

      await waitFor(() => expect(screen.getByText("La Paz")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: /nueva ciudad/i }));
      await user.type(screen.getByLabelText(/^Nombre/), "La Paz");
      await user.click(screen.getByRole("button", { name: "Crear" }));

      expect(await screen.findByText("La ciudad ya existe")).toBeInTheDocument();
    });
  });

  describe("Edición y baja", () => {
    it("abre el formulario con los datos de la fila", async () => {
      const user = userEvent.setup();
      render(<CatalogsSection />);

      await waitFor(() => expect(screen.getByText("La Paz")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Editar La Paz" }));

      expect(screen.getByRole("heading", { name: "Editar ciudad" })).toBeInTheDocument();
      expect(screen.getByLabelText(/^Nombre/)).toHaveValue("La Paz");
      expect(screen.getByLabelText(/Código de área/)).toHaveValue("22");
    });

    it("actualiza la fila elegida", async () => {
      const user = userEvent.setup();
      apiService.catalogService.update.mockResolvedValue({ data: {} });
      render(<CatalogsSection />);

      await waitFor(() => expect(screen.getByText("La Paz")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Editar La Paz" }));
      await user.clear(screen.getByLabelText(/Prefijo postal/));
      await user.type(screen.getByLabelText(/Prefijo postal/), "LPZ");
      await user.click(screen.getByRole("button", { name: "Actualizar" }));

      await waitFor(() => {
        expect(apiService.catalogService.update).toHaveBeenCalledWith("cities", 1, {
          name: "La Paz",
          postalPrefix: "LPZ",
          areaCode: "22",
        });
      });
    });

    it("pide confirmación antes de dar de baja", async () => {
      const user = userEvent.setup();
      apiService.catalogService.remove.mockResolvedValue({ data: {} });
      render(<CatalogsSection />);

      await waitFor(() => expect(screen.getByText("La Paz")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Dar de baja La Paz" }));

      expect(screen.getByText("Confirmar baja")).toBeInTheDocument();
      expect(apiService.catalogService.remove).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Dar de baja" }));

      await waitFor(() => {
        expect(apiService.catalogService.remove).toHaveBeenCalledWith("cities", 1);
      });
    });

    it("cancelar la confirmación no da de baja nada", async () => {
      const user = userEvent.setup();
      render(<CatalogsSection />);

      await waitFor(() => expect(screen.getByText("La Paz")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Dar de baja La Paz" }));
      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      await waitFor(() => {
        expect(screen.queryByText("Confirmar baja")).not.toBeInTheDocument();
      });
      expect(apiService.catalogService.remove).not.toHaveBeenCalled();
    });
  });

  describe("Aspecto compartido", () => {
    it("usa la tabla y el diálogo comunes, no unos propios", async () => {
      const user = userEvent.setup();
      const { container } = render(<CatalogsSection />);

      await waitFor(() => expect(screen.getByText("La Paz")).toBeInTheDocument());
      expect(container.querySelector("table.data-table")).toBeInTheDocument();
      expect(container.querySelector(".data-table-container")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /nueva ciudad/i }));
      const dialogo = container.querySelector(".form-modal-overlay");
      expect(dialogo).toHaveAttribute("role", "dialog");
      expect(dialogo).toHaveAttribute("aria-modal", "true");
      expect(
        within(container.querySelector(".form-modal-header")).getByRole("button", {
          name: "Cerrar formulario",
        })
      ).toBeInTheDocument();
    });

    it("muestra un estado vacío cuando el catálogo no tiene entradas", async () => {
      apiService.catalogService.list.mockResolvedValue({ data: [] });
      render(<CatalogsSection />);

      await waitFor(() => {
        expect(screen.getByText("Sin ciudades")).toBeInTheDocument();
      });
    });
  });
});
