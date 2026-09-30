import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { MdErrorOutline } from "react-icons/md";
import Button from "./ui/Button";
import {
  validateName,
  validatePrice,
  validateStock,
  firstInvalidField,
  isClean,
} from "../utils/validation";
import "../styles/productForm.css";

const EMPTY_FORM = {
  name: "",
  category: "",
  price: "",
  stock: "",
};

// Orden visual, para llevar el foco al primer campo con error al enviar.
const FIELD_ORDER = ["name", "category", "price", "stock"];

/**
 * ProductForm - Componente para crear y editar productos
 * @param {Object} product - Producto a editar (null para crear)
 * @param {boolean} isOpen - Control de visibilidad del modal
 * @param {Function} onClose - Callback para cerrar el modal
 * @param {Function} onSubmit - Callback para guardar producto
 * @param {Array<string>} categories - Lista de categorías disponibles
 */
const ProductForm = ({ product, isOpen, onClose, onSubmit, categories }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldRefs = useRef({});

  // Inicializar formulario cuando se abre o cambia el producto
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
          name: product.name || "",
          category: product.category || "",
          price: product.price ?? "",
          stock: product.stock ?? "",
        });
      } else {
        setFormData(EMPTY_FORM);
      }
      setErrors({});
      setTouched({});
    }
  }, [isOpen, product]);

  const validateField = (field, value) => {
    switch (field) {
      case "name":
        return validateName(value);
      case "category":
        return typeof value === "string" && value.trim() ? "" : "La categoría es requerida";
      case "price":
        return validatePrice(value);
      case "stock":
        return validateStock(value);
      default:
        return "";
    }
  };

  const validateAll = (data) =>
    FIELD_ORDER.reduce((acc, field) => {
      acc[field] = validateField(field, data[field]);
      return acc;
    }, {});

  /**
   * Manejar cambios en los inputs
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpiar error del campo cuando el usuario empieza a escribir; el mensaje
    // nuevo aparece al salir del campo, no mientras teclea.
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  /**
   * Manejar envío del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validateAll(formData);
    setErrors(nextErrors);
    setTouched(FIELD_ORDER.reduce((acc, field) => ({ ...acc, [field]: true }), {}));

    if (!isClean(nextErrors)) {
      const target = firstInvalidField(nextErrors, FIELD_ORDER);
      if (target && fieldRefs.current[target]) {
        fieldRefs.current[target].focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const productData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: Number(formData.price),
        stock: Number(formData.stock),
      };

      await onSubmit(productData);
      setFormData(EMPTY_FORM);
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

  const fieldError = (field) => (touched[field] ? errors[field] : "");

  const errorFor = (field) => {
    const message = fieldError(field);
    if (!message) {
      return null;
    }
    return (
      <span className="field-error" id={`${field}-error`} role="alert">
        <MdErrorOutline aria-hidden="true" />
        {message}
      </span>
    );
  };

  const a11y = (field) => ({
    "aria-invalid": fieldError(field) ? "true" : undefined,
    "aria-describedby": fieldError(field) ? `${field}-error` : undefined,
  });

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

        <form onSubmit={handleSubmit} className="product-form" noValidate>
          <div className="form-group">
            <label htmlFor="name">Nombre del Producto *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Ej: Laptop Dell XPS 13"
              disabled={isSubmitting}
              ref={(el) => {
                fieldRefs.current.name = el;
              }}
              {...a11y("name")}
            />
            {errorFor("name")}
          </div>

          <div className="form-group">
            <label htmlFor="category">Categoría *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              ref={(el) => {
                fieldRefs.current.category = el;
              }}
              {...a11y("category")}
            >
              <option value="">-- Selecciona una categoría --</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errorFor("category")}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Precio (Bs) *</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={isSubmitting}
                ref={(el) => {
                  fieldRefs.current.price = el;
                }}
                {...a11y("price")}
              />
              {errorFor("price")}
            </div>

            <div className="form-group">
              <label htmlFor="stock">Stock *</label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0"
                min="0"
                step="1"
                disabled={isSubmitting}
                ref={(el) => {
                  fieldRefs.current.stock = el;
                }}
                {...a11y("stock")}
              />
              <span className="field-hint">Unidades enteras</span>
              {errorFor("stock")}
            </div>
          </div>

          {errors.submit && (
            <div className="error-message submit-error" role="alert">
              {errors.submit}
            </div>
          )}

          <div className="form-actions">
            <Button
              type="button"
              variant="secondary"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="btn btn-primary"
              loading={isSubmitting}
            >
              {isSubmitting ? "Guardando..." : "Guardar Producto"}
            </Button>
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
