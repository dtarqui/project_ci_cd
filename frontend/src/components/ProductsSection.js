import React, { useState, useEffect, useCallback } from "react";
import { MdSearch, MdSort, MdEdit, MdDelete, MdAdd } from "react-icons/md";
import { dashboardService } from "../services/api";
import ProductForm from "./ProductForm";
import "../styles/productsActions.css";

const ProductsSection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategory) params.append("category", selectedCategory);
      params.append("sort", sortBy);

      const response = await dashboardService.getProducts(params.toString());

      setProducts(response.data || []);
      setError(null);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, sortBy]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /**
   * Abrir formulario para crear nuevo producto
   */
  const handleCreateProduct = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  /**
   * Abrir formulario para editar un producto
   */
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  /**
   * Guardar producto (crear o actualizar)
   */
  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        // Actualizar producto existente
        const response = await dashboardService.updateProduct(
          editingProduct.id,
          productData,
        );
        setProducts(
          products.map((p) => (p.id === editingProduct.id ? response.data : p)),
        );
      } else {
        // Crear nuevo producto
        const response = await dashboardService.createProduct(productData);
        setProducts([...products, response.data]);
      }
      setFormOpen(false);
      setEditingProduct(null);
    } catch (err) {
      console.error("Error saving product:", err);
      throw err;
    }
  };

  /**
   * Eliminar producto
   */
  const handleDeleteProduct = async (id) => {
    try {
      await dashboardService.deleteProduct(id);
      setProducts(products.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting product:", err);
      setError("No se pudo eliminar el producto");
    }
  };

  const categories = [...new Set(products.map((p) => p.category))].sort();

  const getStatusColor = (status) => {
    switch (status) {
      case "En Stock":
        return "green";
      case "Bajo Stock":
        return "orange";
      case "Sin Stock":
        return "red";
      default:
        return "gray";
    }
  };

  if (error) {
    return (
      <div className="section-content">
        <h2>Gestión de Productos</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="section-content products-section">
      <div className="products-header">
        <div>
          <h2>Gestión de Productos</h2>
          <p>
            Administra tu catálogo de productos ({products.length} artículos)
          </p>
        </div>
        <button
          className="btn-create-product"
          onClick={handleCreateProduct}
          title="Crear nuevo producto"
        >
          <MdAdd size={20} />
          Nuevo Producto
        </button>
      </div>

      <div className="products-filters">
        <div className="search-box">
          <MdSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="filter-select"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <div className="sort-box">
          <MdSort className="sort-icon" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="name">Nombre (A-Z)</option>
            <option value="price">Precio (Menor a Mayor)</option>
            <option value="stock">Stock (Mayor a Menor)</option>
            <option value="sales">Ventas (Mayor a Menor)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando productos...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <p>No hay productos que coincidan con los filtros</p>
          <button className="btn-create-product" onClick={handleCreateProduct}>
            <MdAdd size={20} />
            Crear Primer Producto
          </button>
        </div>
      ) : (
        <div className="products-table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Ventas</th>
                <th>Última Venta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="product-name">{product.name}</td>
                  <td>{product.category}</td>
                  <td className="product-price">${product.price.toFixed(2)}</td>
                  <td className="product-stock">{product.stock} unidades</td>
                  <td>
                    <span
                      className={`status-badge status-${getStatusColor(
                        product.status,
                      )}`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="product-sales">{product.sales}</td>
                  <td>{product.lastSale}</td>
                  <td className="product-actions">
                    <button
                      className="btn-action btn-edit"
                      onClick={() => handleEditProduct(product)}
                      title="Editar producto"
                      aria-label={`Editar ${product.name}`}
                    >
                      <MdEdit size={18} />
                    </button>
                    <button
                      className="btn-action btn-delete"
                      onClick={() => setDeleteConfirm(product.id)}
                      title="Eliminar producto"
                      aria-label={`Eliminar ${product.name}`}
                    >
                      <MdDelete size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Formulario */}
      <ProductForm
        product={editingProduct}
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleSaveProduct}
        categories={categories}
      />

      {/* Modal de Confirmación de Eliminación */}
      {deleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-modal">
            <h3>Confirmar Eliminación</h3>
            <p>
              ¿Estás seguro de que deseas eliminar este producto? Esta acción no
              se puede deshacer.
            </p>
            <div className="delete-confirm-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteProduct(deleteConfirm)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ProductsSection.propTypes = {};

export default ProductsSection;
