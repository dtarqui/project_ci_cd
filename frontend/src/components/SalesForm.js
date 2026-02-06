import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { MdAdd, MdClose, MdDelete } from "react-icons/md";
import "../styles/salesForm.css";

const EMPTY_ITEM = { productId: "", quantity: 1 };

const SalesForm = ({
  isOpen,
  onClose,
  onSave,
  customers,
  products,
  loading,
  error,
}) => {
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [status, setStatus] = useState("Completada");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setCustomerId("");
    setPaymentMethod("Efectivo");
    setStatus("Completada");
    setDiscount("0");
    setNotes("");
    setItems([{ ...EMPTY_ITEM }]);
    setFormError("");
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

    const tax = subtotal * 0.13;
    const discountValue = Number(discount) || 0;
    const total = Math.max(subtotal + tax - discountValue, 0);

    return {
      subtotal,
      tax,
      discount: discountValue,
      total,
    };
  }, [items, productMap, discount]);

  if (!isOpen) return null;

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [field]: field === "quantity" ? Number(value) : value,
            }
          : item,
      ),
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
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

    const invalidItem = items.find(
      (item) => !item.productId || !item.quantity || item.quantity <= 0,
    );

    if (invalidItem) {
      setFormError("Agrega productos validos con cantidad mayor a 0.");
      return;
    }

    setFormError("");

    const payload = {
      customerId: Number(customerId),
      items: items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      })),
      discount: Number(discount) || 0,
      paymentMethod,
      notes,
      status,
    };

    try {
      await onSave(payload);
    } catch (saveError) {
      setFormError("No se pudo guardar la venta.");
    }
  };

  return (
    <div className="sales-form-overlay" role="dialog" aria-modal="true">
      <div className="sales-form-modal">
        <div className="sales-form-header">
          <h2>Nueva Venta</h2>
          <button className="sales-form-close" onClick={onClose} type="button">
            <MdClose />
          </button>
        </div>

        <form className="sales-form" onSubmit={handleSubmit}>
          {(error || formError) && (
            <div className="sales-form-error">{error || formError}</div>
          )}

          <div className="sales-form-row">
            <div className="sales-form-field">
              <label>Cliente</label>
              <select
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
            </div>

            <div className="sales-form-field">
              <label>Metodo de pago</label>
              <select
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
              <label>Estado</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="Completada">Completada</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>

            <div className="sales-form-field">
              <label>Descuento (Bs.)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
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
              return (
                <div className="sales-item-row" key={`item-${index}`}>
                  <div className="sales-form-field">
                    <label>Producto</label>
                    <select
                      value={item.productId}
                      onChange={(event) =>
                        handleItemChange(index, "productId", event.target.value)
                      }
                      required
                    >
                      <option value="">Selecciona un producto</option>
                      {products.map((productOption) => (
                        <option key={productOption.id} value={productOption.id}>
                          {productOption.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sales-form-field">
                    <label>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) =>
                        handleItemChange(index, "quantity", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="sales-line-total">
                    <span>Total</span>
                    <strong>
                      {lineTotal.toLocaleString("es-BO", {
                        style: "currency",
                        currency: "BOB",
                        minimumFractionDigits: 2,
                      })}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="sales-item-remove"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                  >
                    <MdDelete />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="sales-summary">
            <div>
              <span>Subtotal</span>
              <strong>
                {summary.subtotal.toLocaleString("es-BO", {
                  style: "currency",
                  currency: "BOB",
                  minimumFractionDigits: 2,
                })}
              </strong>
            </div>
            <div>
              <span>Impuesto (13%)</span>
              <strong>
                {summary.tax.toLocaleString("es-BO", {
                  style: "currency",
                  currency: "BOB",
                  minimumFractionDigits: 2,
                })}
              </strong>
            </div>
            <div>
              <span>Descuento</span>
              <strong>
                {summary.discount.toLocaleString("es-BO", {
                  style: "currency",
                  currency: "BOB",
                  minimumFractionDigits: 2,
                })}
              </strong>
            </div>
            <div className="sales-summary-total">
              <span>Total</span>
              <strong>
                {summary.total.toLocaleString("es-BO", {
                  style: "currency",
                  currency: "BOB",
                  minimumFractionDigits: 2,
                })}
              </strong>
            </div>
          </div>

          <div className="sales-form-field">
            <label>Notas</label>
            <textarea
              rows="3"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notas adicionales"
            />
          </div>

          <div className="sales-form-actions">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              Guardar venta
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
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
    }),
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
};

SalesForm.defaultProps = {
  customers: [],
  products: [],
  loading: false,
  error: "",
};
