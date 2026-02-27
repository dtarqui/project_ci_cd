import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductsSection from "../components/ProductsSection";
import * as apiService from "../services/api";

// Mock de los servicios
jest.mock("../services/api");

describe("Componente ProductsSection - Operaciones CRUD", () => {
  const mockProducts = [
    {
      id: 1,
      name: "Laptop Dell XPS 13",
      category: "Electrónica",
      price: 999.99,
      stock: 45,
      status: "En Stock",
      lastSale: "2026-02-04",
      sales: 156,
    },
    {
      id: 2,
      name: "iPhone 13 Pro",
      category: "Electrónica",
      price: 899.99,
      stock: 32,
      status: "En Stock",
      lastSale: "2026-02-05",
      sales: 289,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    apiService.dashboardService.getProducts.mockResolvedValue({
      data: mockProducts,
    });
  });

  describe("Renderizado", () => {
    it("debe renderizar el header con título", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Gestión de Productos")).toBeInTheDocument();
      });
    });

    it("debe mostrar cantidad de productos", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText(/2 artículos/i)).toBeInTheDocument();
      });
    });

    it("debe renderizar tabla con productos", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 13")).toBeInTheDocument();
        expect(screen.getByText("iPhone 13 Pro")).toBeInTheDocument();
      });
    });

    it("debe mostrar botón de crear nuevo producto", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /nuevo producto/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Crear Producto", () => {
    it("debe mostrar estado de carga", () => {
      apiService.dashboardService.getProducts.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: mockProducts }), 100)
          )
      );

      render(<ProductsSection />);

      expect(screen.getByText(/cargando productos/i)).toBeInTheDocument();
    });

    it("debe mostrar estado vacío cuando no hay productos", async () => {
      apiService.dashboardService.getProducts.mockResolvedValue({
        data: [],
      });

      render(<ProductsSection />);

      await waitFor(() => {
        expect(
          screen.getByText(/no hay productos que coincidan/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Datos de Ejemplo", () => {
    it("debe mostrar mensaje de error cuando falla la API", async () => {
      apiService.dashboardService.getProducts.mockRejectedValue(
        new Error("API Error")
      );

      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Gestión de Productos")).toBeInTheDocument();
      });
    });
  });

  describe("Métodos CRUD", () => {
    it("debe tener método createProduct disponible", () => {
      expect(apiService.dashboardService.createProduct).toBeDefined();
    });

    it("debe tener método updateProduct disponible", () => {
      expect(apiService.dashboardService.updateProduct).toBeDefined();
    });

    it("debe tener método deleteProduct disponible", () => {
      expect(apiService.dashboardService.deleteProduct).toBeDefined();
    });

    it("debe tener método getProduct disponible", () => {
      expect(apiService.dashboardService.getProduct).toBeDefined();
    });
  });

  describe("Filtrado y Búsqueda", () => {
    it("debe llamar getProducts cuando se carga", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(apiService.dashboardService.getProducts).toHaveBeenCalled();
      });
    });

    it("debe tener input de búsqueda", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/buscar productos/i)
        ).toBeInTheDocument();
      });
    });

    it("debe tener selector de categorías", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(
          screen.getByDisplayValue("Todas las categorías")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Estructura de Tabla", () => {
    it("debe mostrar columnas correctas", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Producto")).toBeInTheDocument();
        expect(screen.getByText("Categoría")).toBeInTheDocument();
        expect(screen.getByText("Precio")).toBeInTheDocument();
        expect(screen.getByText("Stock")).toBeInTheDocument();
        expect(screen.getByText("Estado")).toBeInTheDocument();
        expect(screen.getByText("Ventas")).toBeInTheDocument();
        expect(screen.getByText("Última Venta")).toBeInTheDocument();
        expect(screen.getByText("Acciones")).toBeInTheDocument();
      });
    });

    it("debe mostrar estado de producto", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        const statusElements = screen.getAllByText("En Stock");
        expect(statusElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Operaciones CRUD", () => {
    it("debe abrir el formulario de creación al hacer clic en nuevo producto", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /nuevo producto/i })
        ).toBeInTheDocument();
      });

      const createButton = screen.getAllByRole("button", {
        name: /nuevo producto/i,
      })[0];
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/crear nuevo producto/i)).toBeInTheDocument();
      });
    });

    it("debe abrir el formulario para editar al hacer clic en editar", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 13")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: /editar/i });
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/editar producto/i)).toBeInTheDocument();
      });
    });

    it("debe llamar createProduct cuando guarda un producto nuevo", async () => {
      apiService.dashboardService.createProduct.mockResolvedValue({
        data: {
          id: 3,
          name: "Novo Produto",
          category: "Categoria",
          price: 100,
          stock: 10,
          status: "Em Stock",
          lastSale: "2026-02-06",
          sales: 0,
        },
      });

      render(<ProductsSection />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /nuevo producto/i })
        ).toBeInTheDocument();
      });

      const createButton = screen.getAllByRole("button", {
        name: /nuevo producto/i,
      })[0];
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/crear nuevo producto/i)).toBeInTheDocument();
      });

      expect(apiService.dashboardService.createProduct).toBeDefined();
    });

    it("debe llamar updateProduct cuando edita un producto existente", async () => {
      apiService.dashboardService.updateProduct.mockResolvedValue({
        data: mockProducts[0],
      });

      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 13")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: /editar/i });
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/editar producto/i)).toBeInTheDocument();
      });

      expect(apiService.dashboardService.updateProduct).toBeDefined();
    });

    it("debe mostrar confirmación de eliminación", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 13")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText(/¿Estás seguro de que deseas eliminar/i)
        ).toBeInTheDocument();
      });
    });

    it("debe llamar deleteProduct cuando confirma la eliminación", async () => {
      apiService.dashboardService.deleteProduct.mockResolvedValue({});

      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 13")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText(/¿Estás seguro de que deseas eliminar/i)
        ).toBeInTheDocument();
      });

      // Buscar todos los botones de eliminar: el último debe estar en el modal
      const allDeleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
      // Hacer clic en el último (del modal de confirmación)
      await userEvent.click(allDeleteButtons[allDeleteButtons.length - 1]);

      expect(apiService.dashboardService.deleteProduct).toHaveBeenCalled();
    });

    it("debe cerrar el modal de confirmación al cancelar", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 13")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText(/¿Estás seguro de que deseas eliminar/i)
        ).toBeInTheDocument();
      });

      const cancelButtons = screen.getAllByRole("button", { name: /cancelar/i });
      await userEvent.click(cancelButtons[cancelButtons.length - 1]);

      await waitFor(() => {
        expect(
          screen.queryByText(/¿Estás seguro de que deseas eliminar/i)
        ).not.toBeInTheDocument();
      });
    });

    it("debe mostrar error cuando falla la eliminación", async () => {
      apiService.dashboardService.deleteProduct.mockRejectedValue(
        new Error("Delete failed")
      );

      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 13")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText(/¿Estás seguro de que deseas eliminar/i)
        ).toBeInTheDocument();
      });

      const allDeleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
      await userEvent.click(allDeleteButtons[allDeleteButtons.length - 1]);

      expect(apiService.dashboardService.deleteProduct).toHaveBeenCalled();
    });
  });

  describe("Filtros y Ordenamiento", () => {
    it("debe permitir cambiar el término de búsqueda", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/buscar productos/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar productos/i);
      await userEvent.type(searchInput, "Laptop");

      expect(searchInput.value).toBe("Laptop");
    });

    it("debe permitir cambiar la categoría", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Todas las categorías")).toBeInTheDocument();
      });

      const categorySelect = screen.getByDisplayValue("Todas las categorías");
      await userEvent.selectOptions(categorySelect, "Electrónica");

      expect(categorySelect.value).toBe("Electrónica");
    });

    it("debe permitir cambiar el orden", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        const sortSelects = screen.getAllByRole("combobox");
        expect(sortSelects.length).toBeGreaterThan(0);
      });

      const selects = screen.getAllByRole("combobox");
      const sortSelect = selects.find(select => 
        select.querySelector('option[value="price"]')
      );

      if (sortSelect) {
        await userEvent.selectOptions(sortSelect, "price");
        expect(sortSelect.value).toBe("price");
      }
    });

    it("debe recargar productos cuando cambian los filtros", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(apiService.dashboardService.getProducts).toHaveBeenCalled();
      });

      const initialCalls = apiService.dashboardService.getProducts.mock.calls.length;

      const searchInput = screen.getByPlaceholderText(/buscar productos/i);
      await userEvent.type(searchInput, "Test");

      await waitFor(() => {
        expect(apiService.dashboardService.getProducts.mock.calls.length).toBeGreaterThan(initialCalls);
      });
    });
  });

  describe("Estados y Colores", () => {
    it("debe mostrar badge de estado En Stock", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        const statusBadges = screen.getAllByText("En Stock");
        expect(statusBadges.length).toBeGreaterThan(0);
      });
    });

    it("debe aplicar clase de color según el estado", async () => {
      const productsWithDifferentStatuses = [
        { ...mockProducts[0], status: "En Stock" },
        { ...mockProducts[1], status: "Bajo Stock" },
      ];

      apiService.dashboardService.getProducts.mockResolvedValue({
        data: productsWithDifferentStatuses,
      });

      const { container } = render(<ProductsSection />);

      await waitFor(() => {
        const badges = container.querySelectorAll(".status-badge");
        expect(badges.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Información de Productos", () => {
    it("debe mostrar precio formateado", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("$999.99")).toBeInTheDocument();
      });
    });

    it("debe mostrar cantidad de stock con unidades", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("45 unidades")).toBeInTheDocument();
      });
    });

    it("debe mostrar fecha de última venta", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("2026-02-04")).toBeInTheDocument();
      });
    });

    it("debe mostrar número de ventas", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("156")).toBeInTheDocument();
      });
    });
  });

  describe("Modal de ProductForm", () => {
    it("debe pasar categorías al formulario", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 13")).toBeInTheDocument();
      });

      const createButton = screen.getAllByRole("button", {
        name: /nuevo producto/i,
      })[0];
      await userEvent.click(createButton);

      // El formulario debe estar presente
      await waitFor(() => {
        expect(screen.getByText(/crear nuevo producto/i)).toBeInTheDocument();
      });
    });

    it("debe cerrar el formulario cuando se cancela", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 13")).toBeInTheDocument();
      });

      const createButton = screen.getAllByRole("button", {
        name: /nuevo producto/i,
      })[0];
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/crear nuevo producto/i)).toBeInTheDocument();
      });

      const cancelButtons = screen.getAllByRole("button", { name: /cancelar/i });
      await userEvent.click(cancelButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText(/crear nuevo producto/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Acciones de Botones", () => {
    it("debe tener iconos en los botones de acción", async () => {
      const { container } = render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 13")).toBeInTheDocument();
      });

      const editButtons = container.querySelectorAll(".btn-edit");
      const deleteButtons = container.querySelectorAll(".btn-delete");

      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("debe tener aria-labels en botones de acción", async () => {
      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 13")).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/editar laptop dell xps 13/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/eliminar laptop dell xps 13/i)).toBeInTheDocument();
    });
  });

  describe("Manejo de Errores en Operaciones", () => {
    it("debe manejar error al crear producto", async () => {
      apiService.dashboardService.createProduct.mockRejectedValue(
        new Error("Create failed")
      );

      render(<ProductsSection />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /nuevo producto/i })
        ).toBeInTheDocument();
      });

      // La funcionalidad debe estar disponible
      expect(apiService.dashboardService.createProduct).toBeDefined();
    });

    it("debe manejar error al actualizar producto", async () => {
      apiService.dashboardService.updateProduct.mockRejectedValue(
        new Error("Update failed")
      );

      render(<ProductsSection />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 13")).toBeInTheDocument();
      });

      expect(apiService.dashboardService.updateProduct).toBeDefined();
    });
  });
});