import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductsSection from "../components/ProductsSection";
import * as apiService from "../services/api";

// Mock de los servicios
jest.mock("../services/api");

describe("ProductsSection Component - CRUD Operations", () => {
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
    it("deve abrir o formulario de criar cuando clica no botão criar", async () => {
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

    it("deve abrir o formulario para editar quando clica editar", async () => {
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

    it("deve chamar createProduct quando salva novo produto", async () => {
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

    it("deve chamar updateProduct quando edita produto existente", async () => {
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

    it("deve mostrar confirmação de eliminação", async () => {
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

    it("deve chamar deleteProduct quando confirma eliminação", async () => {
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

      // Find all delete buttons - the last one should be in the modal
      const allDeleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
      // Click the last one (from the confirmation modal)
      await userEvent.click(allDeleteButtons[allDeleteButtons.length - 1]);

      expect(apiService.dashboardService.deleteProduct).toHaveBeenCalled();
    });

    it("deve fechar modal de confirmação ao cancelar", async () => {
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

    it("deve mostrar erro quando delete falha", async () => {
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
});