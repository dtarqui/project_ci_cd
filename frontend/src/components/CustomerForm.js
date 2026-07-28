import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Button from "./ui/Button";

const CustomerForm = ({ customer, isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setFormData({
          name: customer.name || "",
          email: customer.email || "",
          phone: customer.phone || "",
          address: customer.address || "",
          city: customer.city || "",
          postalCode: customer.postalCode || "",
        });
      } else {
        setFormData({
          name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          postalCode: "",
        });
      }
      setErrors({});
    }
  }, [isOpen, customer]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    }

    if (!formData.phone.trim() || formData.phone.trim().length < 10) {
      newErrors.phone = "El teléfono debe tener al menos 10 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const customerData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        postalCode: formData.postalCode.trim(),
      };

      await onSubmit(customerData);
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        postalCode: "",
      });
      onClose();
    } catch (error) {
      setErrors({
        submit: error.message || "Error al guardar el cliente",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = !!customer;
  const title = isEditing ? "Editar Cliente" : "Nuevo Cliente";

  return (
    <div className="customer-form-overlay" onClick={onClose}>
      <div
        className="customer-form-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{title}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Nombre *</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Juan García"
              disabled={isSubmitting}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="juan@example.com"
              disabled={isSubmitting}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Teléfono *</label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="1234567890"
              minLength="10"
              disabled={isSubmitting}
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="address">Dirección</label>
            <input
              id="address"
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Calle Principal 123"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="city">Ciudad</label>
            <input
              id="city"
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Madrid"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="postalCode">Código Postal</label>
            <input
              id="postalCode"
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="28001"
              disabled={isSubmitting}
            />
          </div>

          {errors.submit && (
            <div className="error-message submit-error">{errors.submit}</div>
          )}

          <div className="form-actions">
            <Button type="submit" loading={isSubmitting}>
              {isEditing ? "Actualizar" : "Crear"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

CustomerForm.propTypes = {
  customer: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    address: PropTypes.string,
    city: PropTypes.string,
    postalCode: PropTypes.string,
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

CustomerForm.defaultProps = {
  customer: null,
};

export default CustomerForm;
