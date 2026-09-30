import React, { useState, useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { MdErrorOutline } from "react-icons/md";
import Button from "./ui/Button";
import "../styles/formModal.css";
import {
  normalizePhone,
  validateName,
  validateEmail,
  validatePhone,
  validateAddress,
  validateCity,
  validatePostalCode,
  firstInvalidField,
  isClean,
  PHONE_DIGITS,
} from "../utils/validation";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
};

// Orden visual de los campos: define a cual se le lleva el foco al enviar con
// errores, para que sea el primero que el usuario ve y no uno fuera de pantalla.
const FIELD_ORDER = ["name", "email", "phone", "address", "city", "postalCode"];

/**
 * El codigo postal se guarda como "LP-01": el prefijo lo determina la ciudad, asi
 * que se muestra fijo al lado del campo y el usuario solo teclea el numero. Al
 * editar hay que deshacer esa union para volver a poblar el campo.
 */
const splitPostalCode = (postalCode, prefix) => {
  if (!postalCode) {
    return "";
  }
  if (prefix && postalCode.startsWith(`${prefix}-`)) {
    return postalCode.slice(prefix.length + 1);
  }
  return postalCode;
};

const joinPostalCode = (suffix, prefix) => {
  const value = (suffix || "").trim();
  if (!value) {
    return "";
  }
  return prefix ? `${prefix}-${value}` : value;
};

/**
 * CustomerForm - Crear y editar clientes.
 * @param {Object} customer - Cliente a editar (null para crear)
 * @param {boolean} isOpen - Control de visibilidad del modal
 * @param {Function} onClose - Callback para cerrar el modal
 * @param {Function} onSubmit - Callback para guardar el cliente
 * @param {Array<Object>} cities - Catalogo de ciudades atendidas que sirve
 *   GET /api/customers/cities ({ name, postalPrefix, areaCode }). Lo carga la
 *   seccion, igual que ProductForm recibe sus categorias. Si llega vacio (la
 *   peticion fallo), la ciudad vuelve a ser un campo de texto para no dejar al
 *   usuario sin poder dar de alta.
 */
const CustomerForm = ({ customer, isOpen, onClose, onSubmit, cities }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldRefs = useRef({});

  const cityNames = useMemo(() => cities.map((city) => city.name), [cities]);
  const hasCatalog = cityNames.length > 0;
  const postalPrefix = useMemo(() => {
    const selected = cities.find((city) => city.name === formData.city);
    return selected ? selected.postalPrefix : "";
  }, [cities, formData.city]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (customer) {
      const selected = cities.find((city) => city.name === customer.city);
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: normalizePhone(customer.phone || ""),
        address: customer.address || "",
        city: customer.city || "",
        postalCode: splitPostalCode(
          customer.postalCode || "",
          selected ? selected.postalPrefix : ""
        ),
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
    setTouched({});
    // `cities` no entra en las dependencias a proposito: si el catalogo llega
    // despues de abrir el formulario, no se debe descartar lo que el usuario ya
    // escribio. El unico efecto seria recalcular el prefijo, y eso ya lo hace el
    // useMemo en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customer]);

  const validateField = (field, value, currentData = formData) => {
    switch (field) {
      case "name":
        return validateName(value);
      case "email":
        return validateEmail(value);
      case "phone":
        return validatePhone(value);
      case "address":
        return validateAddress(value);
      case "city":
        return validateCity(value, cityNames);
      case "postalCode": {
        const selected = cities.find((city) => city.name === currentData.city);
        return validatePostalCode(
          joinPostalCode(value, selected ? selected.postalPrefix : "")
        );
      }
      default:
        return "";
    }
  };

  const validateAll = (data) =>
    FIELD_ORDER.reduce((acc, field) => {
      acc[field] = validateField(field, data[field], data);
      return acc;
    }, {});

  const handleChange = (e) => {
    const { name, value } = e.target;
    // El telefono se guarda ya normalizado: si pegan "+591 2 212-3456", el campo
    // muestra los 8 digitos en vez de dejar al usuario limpiarlo a mano.
    const nextValue = name === "phone" ? normalizePhone(value) : value;

    setFormData((prev) => ({ ...prev, [name]: nextValue }));

    // Mientras escribe solo se quita el error; el mensaje nuevo aparece al salir
    // del campo, para no ir corrigiendole letra por letra.
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

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
      await onSubmit({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: normalizePhone(formData.phone),
        address: formData.address.trim(),
        city: formData.city.trim(),
        postalCode: joinPostalCode(formData.postalCode, postalPrefix),
      });
      setFormData(EMPTY_FORM);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || "Error al guardar el cliente" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = !!customer;
  const title = isEditing ? "Editar Cliente" : "Nuevo Cliente";

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
    <div className="form-modal-overlay customer-form-overlay" onClick={onClose}>
      <div
        className="form-modal customer-form-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="form-modal-header">
          <h3 className="form-modal-title">{title}</h3>
          <button
            className="form-modal-close"
            onClick={onClose}
            type="button"
            aria-label="Cerrar formulario"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="form-modal-body" noValidate>
          <div className="form-field">
            <label htmlFor="name">Nombre *</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Juan García"
              disabled={isSubmitting}
              ref={(el) => {
                fieldRefs.current.name = el;
              }}
              {...a11y("name")}
            />
            {errorFor("name")}
          </div>

          <div className="form-field">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="juan.garcia@email.com"
              disabled={isSubmitting}
              ref={(el) => {
                fieldRefs.current.email = el;
              }}
              {...a11y("email")}
            />
            {errorFor("email")}
          </div>

          <div className="form-field">
            <label htmlFor="phone">Teléfono *</label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="22123456"
              inputMode="numeric"
              maxLength={PHONE_DIGITS}
              autoComplete="tel-national"
              disabled={isSubmitting}
              ref={(el) => {
                fieldRefs.current.phone = el;
              }}
              {...a11y("phone")}
            />
            <span className="field-hint">
              {PHONE_DIGITS} dígitos, sin código de país
            </span>
            {errorFor("phone")}
          </div>

          <div className="form-field">
            <label htmlFor="address">Dirección</label>
            <input
              id="address"
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Av. Mariscal Santa Cruz 1245"
              disabled={isSubmitting}
              ref={(el) => {
                fieldRefs.current.address = el;
              }}
              {...a11y("address")}
            />
            {errorFor("address")}
          </div>

          <div className="form-field">
            <label htmlFor="city">Ciudad</label>
            {hasCatalog ? (
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                ref={(el) => {
                  fieldRefs.current.city = el;
                }}
                {...a11y("city")}
              >
                <option value="">-- Selecciona una ciudad --</option>
                {cities.map((city) => (
                  <option key={city.name} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="city"
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="La Paz"
                disabled={isSubmitting}
                ref={(el) => {
                  fieldRefs.current.city = el;
                }}
                {...a11y("city")}
              />
            )}
            {errorFor("city")}
          </div>

          <div className="form-field">
            <label htmlFor="postalCode">Código Postal</label>
            <div className="input-with-prefix">
              {postalPrefix && (
                <span className="input-prefix" aria-hidden="true">
                  {postalPrefix}-
                </span>
              )}
              <input
                id="postalCode"
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="01"
                disabled={isSubmitting}
                ref={(el) => {
                  fieldRefs.current.postalCode = el;
                }}
                {...a11y("postalCode")}
              />
            </div>
            {postalPrefix && (
              <span className="field-hint">
                El prefijo {postalPrefix} lo pone la ciudad elegida
              </span>
            )}
            {errorFor("postalCode")}
          </div>

          {errors.submit && (
            <div className="form-modal-alert" role="alert">
              {errors.submit}
            </div>
          )}

          <div className="form-modal-actions">
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
  cities: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      postalPrefix: PropTypes.string,
      areaCode: PropTypes.string,
    })
  ),
};

CustomerForm.defaultProps = {
  customer: null,
  cities: [],
};

export default CustomerForm;
