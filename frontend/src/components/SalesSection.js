import React, { useCallback, useMemo, useState } from "react";
import {
  MdSearch,
  MdReceiptLong,
  MdPayment,
  MdCancel,
  MdCheckCircle,
  MdPendingActions,
  MdRefresh,
  MdVisibility,
} from "react-icons/md";
import { saleService, customerService, productService, handleApiError } from "../services/api";
import useEntityList from "../hooks/useEntityList";
import { formatCurrency, formatDate } from "../utils/format";
import SalesForm from "./SalesForm";
import Badge from "./ui/Badge";
import Skeleton from "./ui/Skeleton";
import Spinner from "./ui/Spinner";
import "../styles/sales.css";

const SALE_STATUS_TONE = {
  Completada: "success",
  Pendiente: "warning",
  Anulada: "danger",
};

const SalesSection = () => {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [cancelingSaleId, setCancelingSaleId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const {
    items: sales,
    setItems: setSales,
    loading,
    error: loadError,
    reload: loadSales,
  } = useEntityList(saleService.getSales, { status: selectedStatus });

  const error = loadError ? handleApiError(loadError) : actionError;

  const loadFormOptions = useCallback(async () => {
    try {
      setFormLoading(true);
      const [customersResponse, productsResponse] = await Promise.all([
        customerService.getCustomers(),
        productService.getProducts(),
      ]);
      setCustomers(customersResponse.data || []);
      setProducts(productsResponse.data || []);
      setFormError("");
    } catch (err) {
      setFormError(handleApiError(err));
    } finally {
      setFormLoading(false);
    }
  }, []);

  const filteredSales = useMemo(() => {
    if (!searchTerm) return sales;
    const term = searchTerm.toLowerCase();
    return sales.filter(
      (sale) =>
        sale.customerName.toLowerCase().includes(term) ||
        String(sale.id).includes(term),
    );
  }, [sales, searchTerm]);

  const metrics = useMemo(() => {
    const totalRevenue = filteredSales.reduce(
      (acc, sale) => acc + (sale.total || 0),
      0,
    );
    const pendingCount = filteredSales.filter(
      (sale) => sale.status === "Pendiente",
    ).length;
    const averageTicket = filteredSales.length
      ? totalRevenue / filteredSales.length
      : 0;

    return {
      totalSales: filteredSales.length,
      totalRevenue,
      pendingCount,
      averageTicket,
    };
  }, [filteredSales]);

  const selectedSale = useMemo(
    () => filteredSales.find((sale) => sale.id === selectedSaleId),
    [filteredSales, selectedSaleId],
  );

  const handleCancelSale = async (saleId) => {
    setCancelingSaleId(saleId);

    try {
      const response = await saleService.cancelSale(saleId);
      setSales((prev) =>
        prev.map((sale) => (sale.id === saleId ? response.data : sale)),
      );
    } catch (err) {
      setActionError(handleApiError(err));
    } finally {
      setCancelingSaleId(null);
    }
  };

  const handleOpenForm = () => {
    setFormOpen(true);
    loadFormOptions();
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setFormError("");
  };

  const handleCreateSale = async (saleData) => {
    try {
      await saleService.createSale(saleData);
      await loadSales();
      setFormOpen(false);
      setFormError("");
    } catch (err) {
      const message = handleApiError(err);
      setFormError(message);
      throw err;
    }
  };

  return (
    <div className="sales-section">
      <div className="sales-hero">
        <div className="sales-hero-content">
          <h2>Ventas & Operaciones</h2>
          <p className="sales-subtitle">
            Controla pedidos, pagos y estados en un solo tablero.
          </p>
        </div>
        <div className="sales-hero-actions">
          <button className="sales-btn sales-btn-ghost" onClick={loadSales}>
            <MdRefresh /> Actualizar
          </button>
          <button className="sales-btn sales-btn-primary" onClick={handleOpenForm}>
            <MdReceiptLong /> Nueva Venta
          </button>
        </div>
      </div>

      <div className="sales-metrics">
        <div className="sales-card accent">
          <div>
            <p>Total de ventas</p>
            <h3>{metrics.totalSales}</h3>
            <span>Últimos movimientos</span>
          </div>
          <MdReceiptLong />
        </div>
        <div className="sales-card">
          <div>
            <p>Ingresos acumulados</p>
            <h3>{formatCurrency(metrics.totalRevenue)}</h3>
            <span>Bolivianos (Bs.)</span>
          </div>
          <MdPayment />
        </div>
        <div className="sales-card">
          <div>
            <p>Ticket promedio</p>
            <h3>{formatCurrency(metrics.averageTicket)}</h3>
            <span>Por venta registrada</span>
          </div>
          <MdCheckCircle />
        </div>
        <div className="sales-card warning">
          <div>
            <p>Pendientes</p>
            <h3>{metrics.pendingCount}</h3>
            <span>Por confirmar</span>
          </div>
          <MdPendingActions />
        </div>
      </div>

      <div className="sales-filters">
        <div className="sales-search">
          <MdSearch />
          <input
            type="text"
            placeholder="Buscar por cliente o ID"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="sales-status">
          <button
            className={!selectedStatus ? "active" : ""}
            onClick={() => setSelectedStatus("")}
          >
            Todas
          </button>
          <button
            className={selectedStatus === "Completada" ? "active" : ""}
            onClick={() => setSelectedStatus("Completada")}
          >
            Completadas
          </button>
          <button
            className={selectedStatus === "Pendiente" ? "active" : ""}
            onClick={() => setSelectedStatus("Pendiente")}
          >
            Pendientes
          </button>
          <button
            className={selectedStatus === "Anulada" ? "active" : ""}
            onClick={() => setSelectedStatus("Anulada")}
          >
            Anuladas
          </button>
        </div>
      </div>

      <div className="sales-grid">
        <section className="sales-table">
          <header>
            <h3>Ordenes recientes</h3>
            <span>{filteredSales.length} resultados</span>
          </header>

          {loading ? (
            <div className="sales-list" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="sales-row sales-row-skeleton" key={index}>
                  <div>
                    <Skeleton width="60px" height="14px" />
                    <Skeleton width="120px" height="12px" style={{ marginTop: 8 }} />
                  </div>
                  <div>
                    <Skeleton width="80px" height="14px" />
                    <Skeleton width="60px" height="12px" style={{ marginTop: 8 }} />
                  </div>
                  <div>
                    <Skeleton width="90px" height="20px" radius="var(--radius-pill)" />
                  </div>
                  <div>
                    <Skeleton width="70px" height="28px" radius="var(--radius-pill)" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="sales-state error">{error}</div>
          ) : filteredSales.length === 0 ? (
            <div className="sales-state">No hay ventas para mostrar.</div>
          ) : (
            <div className="sales-list">
              {filteredSales.map((sale) => (
                <article
                  key={sale.id}
                  className={
                    selectedSaleId === sale.id
                      ? "sales-row active"
                      : "sales-row"
                  }
                  onClick={() => setSelectedSaleId(sale.id)}
                >
                  <div>
                    <p className="row-title">#{sale.id}</p>
                    <span>{sale.customerName}</span>
                  </div>
                  <div>
                    <p>{formatCurrency(sale.total)}</p>
                    <span>{sale.items.length} items</span>
                  </div>
                  <div>
                    <Badge tone={SALE_STATUS_TONE[sale.status] || "neutral"}>
                      {sale.status}
                    </Badge>
                    <span>{formatDate(sale.createdAt)}</span>
                  </div>
                  <div className="row-actions">
                    <button className="ghost">
                      <MdVisibility /> Ver
                    </button>
                    {sale.status !== "Anulada" && (
                      <button
                        className="danger"
                        disabled={cancelingSaleId === sale.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCancelSale(sale.id);
                        }}
                      >
                        {cancelingSaleId === sale.id ? (
                          <Spinner size="sm" className="ui-btn-spinner" />
                        ) : (
                          <MdCancel />
                        )}{" "}
                        Anular
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="sales-detail">
          <header>
            <h3>Detalle de venta</h3>
            <span>
              {selectedSale
                ? `Orden #${selectedSale.id}`
                : "Selecciona una orden"}
            </span>
          </header>

          {selectedSale ? (
            <div className="detail-body">
              <div className="detail-block">
                <p>Cliente</p>
                <h4>{selectedSale.customerName}</h4>
              </div>
              <div className="detail-block inline">
                <div>
                  <p>Método de pago</p>
                  <h4>{selectedSale.paymentMethod}</h4>
                </div>
                <div>
                  <p>Estado</p>
                  <Badge tone={SALE_STATUS_TONE[selectedSale.status] || "neutral"}>
                    {selectedSale.status}
                  </Badge>
                </div>
              </div>
              <div className="detail-items">
                {selectedSale.items.map((item) => (
                  <div key={`${selectedSale.id}-${item.productId}`}>
                    <span>{item.name}</span>
                    <strong>
                      {item.quantity} x {formatCurrency(item.price)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="detail-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatCurrency(selectedSale.subtotal)}</strong>
                </div>
                <div>
                  <span>Impuestos</span>
                  <strong>{formatCurrency(selectedSale.tax)}</strong>
                </div>
                <div>
                  <span>Descuento</span>
                  <strong>{formatCurrency(selectedSale.discount)}</strong>
                </div>
                <div className="total">
                  <span>Total</span>
                  <strong>{formatCurrency(selectedSale.total)}</strong>
                </div>
              </div>
              <div className="detail-note">
                <p>Notas</p>
                <span>{selectedSale.notes || "Sin observaciones"}</span>
              </div>
            </div>
          ) : (
            <div className="detail-empty">
              <MdReceiptLong />
              <p>Selecciona una venta para ver el detalle completo.</p>
            </div>
          )}
        </aside>
      </div>

      <SalesForm
        isOpen={formOpen}
        onClose={handleCloseForm}
        onSave={handleCreateSale}
        customers={customers}
        products={products}
        loading={formLoading}
        error={formError}
      />
    </div>
  );
};

export default SalesSection;
