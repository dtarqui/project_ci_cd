import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "../styles/productForm.css";

/**
 * ProductForm - Componente para crear y editar productos
 * @param {Object} product - Producto a editar (null para crear)
 * @param {boolean} isOpen - Control de visibilidad del modal
 * @param {Function} onClose - Callback para cerrar el modal
 * @param {Function} onSubmit - Callback para guardar producto
 * @param {Array<string>} categories - Lista de categorías disponibles
 */
const ProductForm = ({ product, isOpen, onClose, onSubmit, categories }) => {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar formulario cuando se abre o cambia el producto
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
          name: product.name || "",
          category: product.category || "",
          price: product.price || "",
          stock: product.stock || "",
        });
      } else {
        setFormData({
          name: "",
          category: "",
          price: "",
          stock: "",
        });
      }
      setErrors({});
    }
  }, [isOpen, product]);

  /**
   * Validar formulario
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    if (!formData.category.trim()) {
      newErrors.category = "La categoría es requerida";
    }

    if (formData.price === "" || parseFloat(formData.price) < 0) {
      newErrors.price = "El precio debe ser un número positivo";
    }

    if (formData.stock === "" || parseInt(formData.stock) < 0) {
      newErrors.stock = "El stock debe ser un número no negativo";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Manejar cambios en los inputs
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  /**
   * Manejar envío del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const productData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
      };

      await onSubmit(productData);
      setFormData({ name: "", category: "", price: "", stock: "" });
      onClose();
    } catch (error) {
      setErrors({
        submit: error.message || "Error al guardar el producto",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = !!product;
  const title = isEditing ? "Editar Producto" : "Crear Nuevo Producto";

  return (
    <div className="product-form-overlay">
      <div className="product-form-modal">
        <div className="product-form-header">
          <h2>{title}</h2>
          <button
            className="product-form-close"
            onClick={onClose}
            type="button"
            aria-label="Cerrar formulario"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-group">
            <label htmlFor="name">Nombre del Producto *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Laptop Dell XPS 13"
              disabled={isSubmitting}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="category">Categoría *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="">-- Selecciona una categoría --</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <span className="error-message">{errors.category}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Precio (USD) *</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={isSubmitting}
              />
              {errors.price && (
                <span className="error-message">{errors.price}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="stock">Stock *</label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="0"
                min="0"
                disabled={isSubmitting}
              />
              {errors.stock && (
                <span className="error-message">{errors.stock}</span>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="error-message submit-error">{errors.submit}</div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando..." : "Guardar Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

ProductForm.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    category: PropTypes.string,
    price: PropTypes.number,
    stock: PropTypes.number,
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
};

ProductForm.defaultProps = {
  product: null,
};

export default ProductForm;
