import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import Pagination from "./ui/Pagination";
import Skeleton from "./ui/Skeleton";
import Spinner from "./ui/Spinner";
import "../styles/sales.css";

const SALE_STATUS_TONE = {
  Completada: "success",
  Pendiente: "warning",
  Anulada: "danger",
};

const PAGE_SIZE = 10;

const SalesSection = () => {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [cities, setCities] = useState([]);
  const [cancelingSaleId, setCancelingSaleId] = useState(null);
  // Venta pendiente de confirmar su anulacion. null = no hay dialogo abierto.
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [actionError, setActionError] = useState(null);

  const salesFilters = { status: selectedStatus, search: searchTerm };

  const {
    items: sales,
    loading,
    error: loadError,
    reload: loadSales,
    meta,
  } = useEntityList(saleService.getSales, {
    ...salesFilters,
    page,
    pageSize: PAGE_SIZE,
  });

  // Sin paginar, solo para las tarjetas de metricas: deben reflejar TODAS
  // las ventas que matchean el filtro/busqueda, no solo la pagina visible.
  const { items: allMatchingSales, reload: reloadMetrics } = useEntityList(
    saleService.getSales,
    salesFilters,
  );

  // Volver a la pagina 1 cuando cambian filtro de estado o busqueda.
  useEffect(() => {
    setPage(1);
  }, [selectedStatus, searchTerm]);

  const error = loadError ? handleApiError(loadError) : actionError;

  const loadFormOptions = useCallback(async () => {
    try {
      setFormLoading(true);
      const [customersResponse, productsResponse, citiesResponse] = await Promise.all([
        customerService.getCustomers(),
        productService.getProducts(),
        // El catalogo alimenta el alta de cliente desde la propia venta. Si
        // falla, no se bloquea la venta: el formulario anidado cae a texto libre.
        customerService.getCities().catch(() => ({ data: [] })),
      ]);
      setCustomers(customersResponse.data || []);
      setProducts(productsResponse.data || []);
      setCities(citiesResponse.data || []);
      setFormError("");
    } catch (err) {
      setFormError(handleApiError(err));
    } finally {
      setFormLoading(false);
    }
  }, []);

  const metrics = useMemo(() => {
    const totalRevenue = allMatchingSales.reduce(
      (acc, sale) => acc + (sale.total || 0),
      0,
    );
    const pendingCount = allMatchingSales.filter(
      (sale) => sale.status === "Pendiente",
    ).length;
    const averageTicket = allMatchingSales.length
      ? totalRevenue / allMatchingSales.length
      : 0;

    return {
      totalSales: allMatchingSales.length,
      totalRevenue,
      pendingCount,
      averageTicket,
    };
  }, [allMatchingSales]);

  const selectedSale = useMemo(
    () => sales.find((sale) => sale.id === selectedSaleId),
    [sales, selectedSaleId],
  );

  const handleCancelSale = async (saleId) => {
    setCancelingSaleId(saleId);

    try {
      await saleService.cancelSale(saleId);
      await Promise.all([loadSales(), reloadMetrics()]);
      setCancelConfirm(null);
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

  /**
   * Alta de cliente desde el formulario de venta. Crea, lo agrega a la lista de
   * opciones y lo devuelve para que SalesForm lo deje seleccionado, de modo que
   * el usuario no tenga que abandonar la venta a medio cargar.
   */
  const handleCreateCustomerFromSale = async (customerData) => {
    try {
      const response = await customerService.createCustomer(customerData);
      const created = response.data;
      setCustomers((prev) => [...prev, created]);
      return created;
    } catch (err) {
      throw new Error(handleApiError(err));
    }
  };

  const handleCreateSale = async (saleData) => {
    try {
      await saleService.createSale(saleData);
      await Promise.all([loadSales(), reloadMetrics()]);
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
            <span>{meta?.total ?? sales.length} resultados</span>
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
          ) : sales.length === 0 ? (
            <div className="sales-state">No hay ventas para mostrar.</div>
          ) : (
            <div className="sales-list">
              {sales.map((sale) => (
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
                          setCancelConfirm(sale);
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

          {meta && (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              pageSize={meta.pageSize}
              onPageChange={setPage}
            />
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
              <div className="detail-block">
                <p>Vendedor</p>
                <h4>{selectedSale.userName || "No registrado"}</h4>
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
        cities={cities}
        loading={formLoading}
        error={formError}
        onCreateCustomer={handleCreateCustomerFromSale}
      />

      <Modal isOpen={!!cancelConfirm} onClose={() => setCancelConfirm(null)}>
        <h3 className="ui-modal-danger-title">Anular venta</h3>
        <p>
          ¿Anular la venta <strong>#{cancelConfirm?.id}</strong> de{" "}
          <strong>{cancelConfirm?.customerName}</strong> por{" "}
          <strong>{formatCurrency(cancelConfirm?.total || 0)}</strong>?
        </p>
        <p className="ui-confirm-warning">
          La venta se conserva con estado Anulada y no se puede revertir. El stock
          descontado no se repone automáticamente.
        </p>
        <div className="ui-confirm-actions">
          <Button
            variant="danger"
            loading={cancelingSaleId === cancelConfirm?.id}
            onClick={() => handleCancelSale(cancelConfirm.id)}
          >
            Anular venta
          </Button>
          {/* "Volver" y no "Cancelar": al lado de "Anular" las dos palabras
              significan lo mismo en espanol y se presta a confusion. */}
          <Button
            variant="secondary"
            onClick={() => setCancelConfirm(null)}
            disabled={cancelingSaleId === cancelConfirm?.id}
          >
            Volver
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default SalesSection;
