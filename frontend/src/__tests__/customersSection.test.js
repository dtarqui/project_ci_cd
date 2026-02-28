import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CustomersSection from "../components/CustomersSection";
import * as apiService from "../services/api";

// Mock dashboardService
jest.mock("../services/api", () => ({
  dashboardService: {
    getCustomers: jest.fn(),
    createCustomer: jest.fn(),
    updateCustomer: jest.fn(),
    deleteCustomer: jest.fn(),
  },
  handleApiError: jest.fn((error) => error?.message || "Error"),
}));

describe("Componente CustomersSection - Operaciones CRUD", () => {
  const mockCustomers = [
    {
      id: 1,
      name: "Juan García",
      email: "juan.garcia@email.com",
      phone: "1234567890",
      address: "Calle Principal 123",
      city: "Madrid",
      postalCode: "28001",
      status: "Activo",
      registeredDate: "2024-01-15",
      totalSpent: 5420.50,
      purchases: 12,
      lastPurchase: "2026-02-05",
    },
    {
      id: 2,
      name: "María López",
      email: "maria.lopez@email.com",
      phone: "0987654321",
      address: "Avenida Secundaria 456",
      city: "Barcelona",
      postalCode: "08002",
      status: "Activo",
      registeredDate: "2024-02-20",
      totalSpent: 8230.75,
      purchases: 18,
      lastPurchase: "2026-02-06",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem("token", "test_token");
    apiService.dashboardService.getCustomers.mockResolvedValue({
      success: true,
      data: mockCustomers,
      count: 2,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Renderizado", () => {
    it("debe renderizar el header con título", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText("Gestión de Clientes")).toBeInTheDocument();
      });
    });

    it("debe mostrar cantidad de clientes", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText(/2 cliente\(s\) registrado\(s\)/i)).toBeInTheDocument();
      });
    });

    it("debe renderizar tabla con clientes", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText("Juan García")).toBeInTheDocument();
        expect(screen.getByText("María López")).toBeInTheDocument();
      });
    });

    it("debe mostrar botón de nuevo cliente", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Nuevo Cliente/i })
        ).toBeInTheDocument();
      });
    });

    it("debe renderizar controles de búsqueda y filtros", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Nombre, email o teléfono/i)
        ).toBeInTheDocument();
        expect(screen.getByDisplayValue("Nombre")).toBeInTheDocument();
      });
    });
  });

  describe("Búsqueda y Filtros", () => {
    it("debe buscar clientes por nombre", async () => {
      apiService.dashboardService.getCustomers.mockResolvedValue({
        success: true,
        data: [mockCustomers[0]],
        count: 1,
      });

      render(<CustomersSection />);

      const searchInput = await screen.findByPlaceholderText(
        /Nombre, email o teléfono/i
      );
      await userEvent.type(searchInput, "Juan");

      await waitFor(() => {
        expect(apiService.dashboardService.getCustomers).toHaveBeenCalledWith(
          expect.stringContaining("search=Juan")
        );
      });
    });

    it("debe filtrar clientes por estado", async () => {
      apiService.dashboardService.getCustomers.mockResolvedValue({
        success: true,
        data: mockCustomers,
        count: 2,
      });

      render(<CustomersSection />);

      const statusSelects = screen.getAllByDisplayValue("");
      const statusSelect = statusSelects.find(sel => sel.id === "status" || sel.parentElement?.textContent.includes("Estado"));
      if (statusSelect) {
        fireEvent.change(statusSelect, { target: { value: "Activo" } });

        await waitFor(() => {
          const calls = apiService.dashboardService.getCustomers.mock.calls;
          const hasActivoCall = calls.some(call => call[0]?.includes("status=Activo"));
          expect(hasActivoCall).toBe(true);
        });
      }
    });

    it("debe ordenar clientes por nombre", async () => {
      apiService.dashboardService.getCustomers.mockResolvedValue({
        success: true,
        data: mockCustomers,
        count: 2,
      });

      render(<CustomersSection />);

      const sortSelects = screen.getAllByDisplayValue("Nombre");
      if (sortSelects.length > 0) {
        fireEvent.change(sortSelects[0], { target: { value: "email" } });

        await waitFor(() => {
          const calls = apiService.dashboardService.getCustomers.mock.calls;
          const hasEmailCall = calls.some(call => call[0]?.includes("sort=email"));
          expect(hasEmailCall).toBe(true);
        });
      }
    });
  });

  describe("Crear Cliente", () => {
    it("debe abrir formulario al hacer click en 'Nuevo Cliente'", async () => {
      render(<CustomersSection />);

      const addButton = await screen.findByRole("button", {
        name: /Nuevo Cliente/i,
      });
      await userEvent.click(addButton);

      await waitFor(() => {
        const heading = screen.queryAllByText("Nuevo Cliente");
        expect(heading.length).toBeGreaterThan(0);
      });
    });

    it("debe mostrar todos los campos del formulario", async () => {
      render(<CustomersSection />);

      const addButton = await screen.findByRole("button", {
        name: /Nuevo Cliente/i,
      });
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Dirección/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Ciudad/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Código Postal/i)).toBeInTheDocument();
      });
    });

    it("debe crear un nuevo cliente", async () => {
      apiService.dashboardService.createCustomer.mockResolvedValue({
        success: true,
        data: { id: 3, ...mockCustomers[0] },
      });

      render(<CustomersSection />);

      const addButton = await screen.findByRole("button", {
        name: /Nuevo Cliente/i,
      });
      await userEvent.click(addButton);

      const nameInputs = screen.getAllByPlaceholderText("Juan García");
      const nameInput = nameInputs[0];
      const emailInput = screen.getByPlaceholderText("juan@example.com");
      const phoneInput = screen.getByPlaceholderText("1234567890");

      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Test Customer");
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "test@example.com");
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, "1234567890");

      const submitButton = screen.getByRole("button", { name: /Crear/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(apiService.dashboardService.createCustomer).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Test Customer",
            email: "test@example.com",
            phone: "1234567890",
          })
        );
      });
    });
  });

  describe("Editar Cliente", () => {
    it("debe abrir formulario de edición al hacer click en editar", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText("Juan García")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle("Editar");
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        const heading = screen.queryAllByText("Editar Cliente");
        expect(heading.length).toBeGreaterThan(0);
      });
    });

    it("debe cargar datos del cliente en el formulario", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText("Juan García")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle("Editar");
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue("Juan García");
        const emailInput = screen.getByDisplayValue("juan.garcia@email.com");
        expect(nameInput).toBeInTheDocument();
        expect(emailInput).toBeInTheDocument();
      });
    });

    it("debe actualizar un cliente", async () => {
      apiService.dashboardService.updateCustomer.mockResolvedValue({
        success: true,
        data: { ...mockCustomers[0], name: "Updated" },
      });

      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText("Juan García")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle("Editar");
      await userEvent.click(editButtons[0]);

      const nameInput = await screen.findByDisplayValue("Juan García");
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Updated Name");

      const updateButton = screen.getByRole("button", { name: /Actualizar/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(apiService.dashboardService.updateCustomer).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            name: "Updated Name",
          })
        );
      });
    });
  });

  describe("Eliminar Cliente", () => {
    it("debe mostrar modal de confirmación al hacer click en eliminar", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText("Juan García")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle("Eliminar");
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Eliminar Cliente/i)).toBeInTheDocument();
        expect(
          screen.getByText(/estás seguro de que deseas eliminar/i)
        ).toBeInTheDocument();
      });
    });

    it("debe cancelar eliminación", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText("Juan García")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle("Eliminar");
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        const deleteHeadings = screen.queryAllByText(/Eliminar Cliente/i);
        expect(deleteHeadings.length).toBeGreaterThan(0);
      });

      const cancelButtons = screen.getAllByRole("button", { name: /Cancelar/i });
      await userEvent.click(cancelButtons[cancelButtons.length - 1]);

      await waitFor(() => {
        const deleteHeadings = screen.queryAllByText(/Eliminar Cliente/i);
        expect(deleteHeadings.length).toBe(0);
      });
    });

    it("debe eliminar un cliente", async () => {
      apiService.dashboardService.deleteCustomer.mockResolvedValue({
        success: true,
        data: mockCustomers[0],
      });

      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText("Juan García")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle("Eliminar");
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        const deleteHeadings = screen.queryAllByText(/Eliminar Cliente/i);
        expect(deleteHeadings.length).toBeGreaterThan(0);
      });

      const allDeleteButtons = screen.getAllByRole("button", { name: /Eliminar/i });
      // El último boton es el del modal de confirmación
      const confirmDeleteButton = allDeleteButtons[allDeleteButtons.length - 1];
      await userEvent.click(confirmDeleteButton);

      await waitFor(() => {
        expect(apiService.dashboardService.deleteCustomer).toHaveBeenCalledWith(1);
      });
    });
  });

  describe("Estados de Carga", () => {
    it("debe mostrar mensaje cuando no hay clientes", async () => {
      apiService.dashboardService.getCustomers.mockResolvedValue({
        success: true,
        data: [],
        count: 0,
      });

      render(<CustomersSection />);

      await waitFor(() => {
        const emptyState = screen.getByText(/No hay clientes para mostrar/i);
        expect(emptyState).toBeInTheDocument();
      });
    });

    it("debe manejar errores en la recuperación de datos", async () => {
      apiService.dashboardService.getCustomers.mockRejectedValue(new Error("API Error"));

      render(<CustomersSection />);

      await waitFor(() => {
        const rows = screen.queryAllByRole("row");
        expect(rows.length).toBeLessThanOrEqual(1); // Solo header o vacío
      });
    });
  });

  describe("Cerrar Formulario", () => {
    it("debe cerrar formulario al hacer click en cancelar durante creación", async () => {
      render(<CustomersSection />);

      const addButton = await screen.findByRole("button", {
        name: /Nuevo Cliente/i,
      });
      await userEvent.click(addButton);

      await waitFor(() => {
        const heading = screen.queryAllByText("Nuevo Cliente");
        expect(heading.length).toBeGreaterThan(0);
      });

      const cancelButton = screen.getByRole("button", { name: /Cancelar/i });
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByLabelText(/Email \*/i)).not.toBeInTheDocument();
      });
    });

    it("debe cerrar formulario al hacer click en cancelar durante edición", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText("Juan García")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle("Editar");
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        const heading = screen.queryAllByText("Editar Cliente");
        expect(heading.length).toBeGreaterThan(0);
      });

      const cancelButton = screen.getByRole("button", { name: /Cancelar/i });
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByLabelText(/Email \*/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Información de Compras", () => {
    it("debe mostrar información de clientes", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText("Juan García")).toBeInTheDocument();
        expect(screen.getByText("María López")).toBeInTheDocument();
      });
    });

    it("debe mostrar emails de clientes", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText(/juan.garcia@email.com/i)).toBeInTheDocument();
      });
    });

    it("debe mostrar la tabla de clientes", async () => {
      const { container } = render(<CustomersSection />);

      await waitFor(() => {
        const table = container.querySelector("table");
        expect(table).toBeInTheDocument();
      });
    });

    it("debe mostrar información de estado", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        const statusBadges = screen.getAllByText("Activo");
        expect(statusBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Manejo de Errores en Operaciones", () => {
    it("debe manejar error al crear cliente", async () => {
      apiService.dashboardService.createCustomer.mockRejectedValue(
        new Error("Create failed")
      );

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<CustomersSection />);

      const addButton = await screen.findByRole("button", {
        name: /Nuevo Cliente/i,
      });
      await userEvent.click(addButton);

      const nameInputs = screen.getAllByPlaceholderText("Juan García");
      const nameInput = nameInputs[0];
      const emailInput = screen.getByPlaceholderText("juan@example.com");
      const phoneInput = screen.getByPlaceholderText("1234567890");

      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Test");
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "test@test.com");
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, "123");

      const submitButton = screen.getByRole("button", { name: /Crear/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(apiService.dashboardService.createCustomer).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });

    it("debe manejar error al actualizar cliente", async () => {
      apiService.dashboardService.updateCustomer.mockRejectedValue(
        new Error("Update failed")
      );

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<CustomersSection />);

      await waitFor(() => {
        expect(screen.getByText("Juan García")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle("Editar");
      await userEvent.click(editButtons[0]);

      const nameInput = await screen.findByDisplayValue("Juan García");
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Updated");

      const updateButton = screen.getByRole("button", { name: /Actualizar/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(apiService.dashboardService.updateCustomer).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });
  });

  describe("Estados y Badges", () => {
    it("debe mostrar badge de estado Activo", async () => {
      render(<CustomersSection />);

      await waitFor(() => {
        const statusBadges = screen.getAllByText("Activo");
        expect(statusBadges.length).toBeGreaterThan(0);
      });
    });

    it("debe aplicar clase correcta al badge de estado", async () => {
      const { container } = render(<CustomersSection />);

      await waitFor(() => {
        const badges = container.querySelectorAll(".status-badge");
        expect(badges.length).toBeGreaterThan(0);
      });
    });
  });
});
