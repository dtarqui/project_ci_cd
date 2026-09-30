import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { MdAdd, MdClose, MdDelete, MdPersonAdd } from "react-icons/md";
import Button from "./ui/Button";
import CustomerForm from "./CustomerForm";
import { formatCurrency } from "../utils/format";
import "../styles/salesForm.css";

const EMPTY_ITEM = { productId: "", quantity: 1 };

// Misma tasa que TAX_RATE en backend/src/config/constants.js. El backend recalcula
// el total al guardar; esto es solo el avance que ve el usuario mientras carga la
// venta. Si cambia alla, cambia aca.
const TAX_RATE = 0.13;

/** Stock declarado del producto, o null si el producto no lo informa. */
const stockOf = (product) =>
  product && typeof product.stock === "number" ? product.stock : null;

const SalesForm = ({
  isOpen,
  onClose,
  onSave,
  customers,
  products,
  cities,
  loading,
  error,
  onCreateCustomer,
}) => {
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [status, setStatus] = useState("Completada");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [formError, setFormError] = useState("");
  const [itemErrors, setItemErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerId("");
    setPaymentMethod("Efectivo");
    setStatus("Completada");
    setDiscount("0");
    setNotes("");
    setItems([{ ...EMPTY_ITEM }]);
    setFormError("");
    setItemErrors([]);
    setIsSubmitting(false);
    setCustomerFormOpen(false);
  }, [isOpen]);

  const productMap = useMemo(() => {
    return products.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});
  }, [products]);

  const summary = useMemo(() => {
    const subtotal = items.reduce((acc, item) => {
      const product = productMap[item.productId];
      if (!product) return acc;
      return acc + product.price * item.quantity;
    }, 0);

    const tax = subtotal * TAX_RATE;
    const discountValue = Number(discount) || 0;
    const total = Math.max(subtotal + tax - discountValue, 0);

    return {
      subtotal,
      tax,
      discount: discountValue,
      // Tope del descuento: mas alla de esto el total se recortaba a 0 y la venta
      // se guardaba regalando la diferencia sin avisar.
      maxDiscount: subtotal + tax,
      total,
    };
  }, [items, productMap, discount]);

  /**
   * Revisa las lineas de la venta y devuelve un mensaje por linea ("" si esta
   * bien). Cubre tres cosas que antes pasaban: linea sin producto o con cantidad
   * <= 0, cantidad por encima del stock (la venta se enviaba y el backend la
   * rechazaba despues) y el mismo producto repetido en dos lineas, que sumaba mal
   * el stock pedido.
   */
  /**
   * Recalcula los errores de linea y baja el banner si ya no queda ninguno. Sin
   * esto, corregir la cantidad limpiaba el aviso de la linea pero dejaba el
   * mensaje de arriba, que contradecia lo que el formulario mostraba.
   */
  const refreshItemErrors = (nextItems) => {
    setItemErrors((prevErrors) => {
      if (!prevErrors.length) {
        return prevErrors;
      }
      const recalculated = validateItems(nextItems);
      if (!recalculated.some((message) => message)) {
        setFormError("");
      }
      return recalculated;
    });
  };

  const validateItems = (currentItems) => {
    const timesChosen = currentItems.reduce((acc, item) => {
      if (item.productId) {
        acc[item.productId] = (acc[item.productId] || 0) + 1;
      }
      return acc;
    }, {});

    return currentItems.map((item) => {
      if (!item.productId) {
        return "Selecciona un producto.";
      }
      if (!item.quantity || item.quantity <= 0) {
        return "La cantidad debe ser mayor a 0.";
      }
      if (timesChosen[item.productId] > 1) {
        return "Este producto ya está en otra línea; junta las cantidades.";
      }
      const product = productMap[item.productId];
      const stock = stockOf(product);
      if (stock !== null && item.quantity > stock) {
        return `Solo hay ${stock} en stock.`;
      }
      return "";
    });
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [field]: field === "quantity" ? Number(value) : value,
            }
          : item,
      );
      // Si ya se habia mostrado un error en las lineas, se recalcula al vuelo:
      // corregir la cantidad debe quitar el aviso sin tener que reenviar.
      refreshItemErrors(next);
      return next;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
    setItemErrors((prev) => (prev.length ? [...prev, ""] : prev));
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      refreshItemErrors(next);
      return next;
    });
  };

  const handleCustomerCreated = async (customerData) => {
    const created = await onCreateCustomer(customerData);
    // Queda seleccionado el cliente recien creado, sin perder los productos ya
    // cargados: el objetivo de crearlo desde aca es no abandonar la venta.
    if (created && created.id !== undefined && created.id !== null) {
      setCustomerId(String(created.id));
      setFormError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!customerId) {
      setFormError("Selecciona un cliente.");
      return;
    }

    if (!paymentMethod) {
      setFormError("Selecciona un metodo de pago.");
      return;
    }

    const nextItemErrors = validateItems(items);
    setItemErrors(nextItemErrors);

    const firstItemError = nextItemErrors.find((message) => message);
    if (firstItemError) {
      // El banner conserva el texto historico cuando el problema es el clasico
      // (falta producto o cantidad <= 0) y muestra el detalle en los casos nuevos.
      const isClassic =
        firstItemError === "Selecciona un producto." ||
        firstItemError === "La cantidad debe ser mayor a 0.";
      setFormError(
        isClassic
          ? "Agrega productos validos con cantidad mayor a 0."
          : firstItemError,
      );
      return;
    }

    const discountValue = Number(discount) || 0;
    if (discountValue > summary.maxDiscount) {
      setFormError(
        `El descuento no puede superar ${formatCurrency(summary.maxDiscount)}.`,
      );
      return;
    }

    setFormError("");

    const payload = {
      customerId: Number(customerId),
      items: items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      })),
      discount: discountValue,
      paymentMethod,
      notes,
      status,
    };

    setIsSubmitting(true);

    try {
      await onSave(payload);
    } catch (saveError) {
      setFormError("No se pudo guardar la venta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const discountExceedsTotal = (Number(discount) || 0) > summary.maxDiscount;

  return (
    <div className="sales-form-overlay" role="dialog" aria-modal="true">
      <div className="sales-form-modal">
        <div className="sales-form-header">
          <h2>Nueva Venta</h2>
          <button className="sales-form-close" onClick={onClose} type="button">
            <MdClose />
          </button>
        </div>

        <form className="sales-form" onSubmit={handleSubmit} noValidate>
          {(error || formError) && (
            <div className="sales-form-error" role="alert">
              {error || formError}
            </div>
          )}

          <div className="sales-form-row">
            <div className="sales-form-field">
              <label htmlFor="sale-customer">Cliente</label>
              <div className="sales-customer-picker">
                <select
                  id="sale-customer"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  disabled={loading}
                  required
                >
                  <option value="">Selecciona un cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {onCreateCustomer && (
                  <button
                    type="button"
                    className="sales-form-add"
                    onClick={() => setCustomerFormOpen(true)}
                    disabled={loading}
                  >
                    <MdPersonAdd /> Nuevo cliente
                  </button>
                )}
              </div>
            </div>

            <div className="sales-form-field">
              <label htmlFor="sale-payment">Metodo de pago</label>
              <select
                id="sale-payment"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
                <option value="QR">QR</option>
              </select>
            </div>
          </div>

          <div className="sales-form-row">
            <div className="sales-form-field">
              <label htmlFor="sale-status">Estado</label>
              <select
                id="sale-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="Completada">Completada</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>

            <div className="sales-form-field">
              <label htmlFor="sale-discount">Descuento (Bs.)</label>
              <input
                id="sale-discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                aria-invalid={discountExceedsTotal ? "true" : undefined}
              />
              {discountExceedsTotal && (
                <span className="sales-field-error">
                  No puede superar {formatCurrency(summary.maxDiscount)}
                </span>
              )}
            </div>
          </div>

          <div className="sales-items">
            <div className="sales-items-header">
              <h3>Productos</h3>
              <button
                type="button"
                className="sales-form-add"
                onClick={handleAddItem}
              >
                <MdAdd /> Agregar item
              </button>
            </div>

            {items.map((item, index) => {
              const product = productMap[item.productId];
              const lineTotal = product ? product.price * item.quantity : 0;
              const stock = stockOf(product);
              const itemError = itemErrors[index] || "";
              return (
                <div className="sales-item-row" key={`item-${index}`}>
                  <div className="sales-form-field">
                    <label htmlFor={`sale-product-${index}`}>Producto</label>
                    <select
                      id={`sale-product-${index}`}
                      value={item.productId}
                      onChange={(event) =>
                        handleItemChange(index, "productId", event.target.value)
                      }
                      required
                    >
                      <option value="">Selecciona un producto</option>
                      {products.map((productOption) => {
                        const optionStock = stockOf(productOption);
                        return (
                          <option key={productOption.id} value={productOption.id}>
                            {optionStock === null
                              ? productOption.name
                              : `${productOption.name} (stock: ${optionStock})`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="sales-form-field">
                    <label htmlFor={`sale-quantity-${index}`}>Cantidad</label>
                    <input
                      id={`sale-quantity-${index}`}
                      type="number"
                      min="1"
                      max={stock === null ? undefined : stock}
                      value={item.quantity}
                      onChange={(event) =>
                        handleItemChange(index, "quantity", event.target.value)
                      }
                      aria-invalid={itemError ? "true" : undefined}
                      required
                    />
                    {stock !== null && (
                      <span className="field-hint">Disponible: {stock}</span>
                    )}
                  </div>

                  <div className="sales-line-total">
                    <span>Total</span>
                    <strong>{formatCurrency(lineTotal)}</strong>
                  </div>

                  <button
                    type="button"
                    className="sales-item-remove"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                  >
                    <MdDelete />
                  </button>

                  {itemError && (
                    <span className="sales-field-error sales-item-error" role="alert">
                      {itemError}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sales-summary">
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrency(summary.subtotal)}</strong>
            </div>
            <div>
              <span>Impuesto (13%)</span>
              <strong>{formatCurrency(summary.tax)}</strong>
            </div>
            <div>
              <span>Descuento</span>
              <strong>{formatCurrency(summary.discount)}</strong>
            </div>
            <div className="sales-summary-total">
              <span>Total</span>
              <strong>{formatCurrency(summary.total)}</strong>
            </div>
          </div>

          <div className="sales-form-field">
            <label htmlFor="sale-notes">Notas</label>
            <textarea
              id="sale-notes"
              rows="3"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notas adicionales"
            />
          </div>

          <div className="sales-form-actions">
            <Button
              className="btn btn-primary"
              type="submit"
              loading={isSubmitting}
              disabled={loading}
            >
              Guardar venta
            </Button>
            <Button
              className="btn btn-secondary"
              variant="secondary"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>

      {onCreateCustomer && (
        <CustomerForm
          isOpen={customerFormOpen}
          onClose={() => setCustomerFormOpen(false)}
          onSubmit={handleCustomerCreated}
          cities={cities}
        />
      )}
    </div>
  );
};

export default SalesForm;

SalesForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  customers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
    }),
  ),
  products: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      price: PropTypes.number,
      stock: PropTypes.number,
    }),
  ),
  // Catalogo de ciudades para el formulario de cliente anidado.
  cities: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      postalPrefix: PropTypes.string,
      areaCode: PropTypes.string,
    }),
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
  // Crea el cliente y devuelve el creado, para dejarlo seleccionado en la venta.
  // Sin este callback no se ofrece el boton "Nuevo cliente".
  onCreateCustomer: PropTypes.func,
};

SalesForm.defaultProps = {
  customers: [],
  products: [],
  cities: [],
  loading: false,
  error: "",
  onCreateCustomer: undefined,
};
