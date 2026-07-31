import React, { useEffect, useState } from "react";
import { MdSearch, MdSort, MdEdit, MdDelete, MdAdd, MdInventory2 } from "react-icons/md";
import { productService, handleApiError } from "../services/api";
import useEntityList from "../hooks/useEntityList";
import { useAuth } from "../context/AuthContext";
import ProductForm from "./ProductForm";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import Modal from "./ui/Modal";
import EmptyState from "./ui/EmptyState";
import Pagination from "./ui/Pagination";
import { SkeletonTableRows } from "./ui/Skeleton";
import { formatCurrency } from "../utils/format";
import "../styles/productsActions.css";

const PRODUCT_STATUS_TONE = {
  "En Stock": "success",
  "Bajo Stock": "warning",
  "Sin Stock": "danger",
};

const TABLE_COLUMNS = 8;
const PAGE_SIZE = 10;

const ProductsSection = () => {
  const { user } = useAuth();
  const canDelete = user?.role === "admin";
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    items: products,
    setItems: setProducts,
    loading,
    meta,
    reload: loadProducts,
  } = useEntityList(productService.getProducts, {
    search: searchTerm,
    category: selectedCategory,
    sort: sortBy,
    page,
    pageSize: PAGE_SIZE,
  });

  // Volver a la página 1 cuando cambian los filtros (evita quedar en una
  // página vacía si el filtro nuevo tiene menos resultados).
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory, sortBy]);

  // Categorías para el filtro: se piden sin paginar aparte, porque `products`
  // ahora solo trae la página actual y dejaría el dropdown incompleto.
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    productService
      .getProducts()
      .then((response) => {
        const cats = [...new Set((response.data || []).map((p) => p.category))].sort();
        setAllCategories(cats);
      })
      .catch(() => {});
  }, []);

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
        const response = await productService.updateProduct(
          editingProduct.id,
          productData,
        );
        setProducts(
          products.map((p) => (p.id === editingProduct.id ? response.data : p)),
        );
      } else {
        // Crear nuevo producto: recarga la pagina actual (agregarlo a mano
        // podria dejar la pagina con 11 items o en el orden equivocado).
        await productService.createProduct(productData);
        await loadProducts();
      }
      setFormOpen(false);
      setEditingProduct(null);
    } catch (err) {
      throw new Error(handleApiError(err));
    }
  };

  /**
   * Eliminar producto
   */
  const handleDeleteProduct = async (id) => {
    setIsDeleting(true);

    try {
      await productService.deleteProduct(id);
      await loadProducts();
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting product:", err);
      setError("No se pudo eliminar el producto");
    } finally {
      setIsDeleting(false);
    }
  };

  const categories = allCategories;

  if (error) {
    return (
      <div className="products-section">
        <h2>Gestión de Productos</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const tableHead = (
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
  );

  return (
    <div className="products-section">
      <div className="products-header">
        <div>
          <h2>Gestión de Productos</h2>
          <p>
            Administra tu catálogo de productos ({meta?.total ?? products.length} artículos)
          </p>
        </div>
        <Button
          className="btn-create-product"
          onClick={handleCreateProduct}
          title="Crear nuevo producto"
          icon={<MdAdd size={20} />}
        >
          Nuevo Producto
        </Button>
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
        <div className="products-table-container">
          <table className="products-table">
            {tableHead}
            <tbody>
              <SkeletonTableRows rows={5} columns={TABLE_COLUMNS} />
            </tbody>
          </table>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<MdInventory2 />}
          description="No hay productos que coincidan con los filtros"
          action={
            <Button
              className="btn-create-product"
              onClick={handleCreateProduct}
              icon={<MdAdd size={20} />}
            >
              Crear Primer Producto
            </Button>
          }
        />
      ) : (
        <div className="products-table-container">
          <table className="products-table">
            {tableHead}
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="product-name">{product.name}</td>
                  <td>{product.category}</td>
                  <td className="product-price">{formatCurrency(product.price)}</td>
                  <td className="product-stock">{product.stock} unidades</td>
                  <td>
                    <Badge tone={PRODUCT_STATUS_TONE[product.status] || "neutral"}>
                      {product.status}
                    </Badge>
                  </td>
                  <td className="product-sales">{product.sales}</td>
                  <td>{product.lastSale}</td>
                  <td className="product-actions">
                    <Button
                      variant="ghost"
                      className="btn-action btn-edit"
                      onClick={() => handleEditProduct(product)}
                      title="Editar producto"
                      aria-label={`Editar ${product.name}`}
                    >
                      <MdEdit size={18} />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        className="btn-action btn-delete"
                        onClick={() => setDeleteConfirm(product.id)}
                        title="Eliminar producto"
                        aria-label={`Eliminar ${product.name}`}
                      >
                        <MdDelete size={18} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={meta.pageSize}
          onPageChange={setPage}
        />
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
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <h3 className="ui-modal-danger-title">Confirmar Eliminación</h3>
        <p>
          ¿Estás seguro de que deseas eliminar este producto? Esta acción no
          se puede deshacer.
        </p>
        <div className="delete-confirm-actions">
          <Button
            variant="secondary"
            onClick={() => setDeleteConfirm(null)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={isDeleting}
            onClick={() => handleDeleteProduct(deleteConfirm)}
          >
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductsSection;
