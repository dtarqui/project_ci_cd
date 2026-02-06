import React, { useState, useEffect, useCallback } from "react";
import { MdSearch, MdSort, MdEdit, MdDelete, MdAdd } from "react-icons/md";
import { dashboardService, handleApiError } from "../services/api";
import "../styles/customersActions.css";

const CustomersSection = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
  });

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedStatus) params.append("status", selectedStatus);
      params.append("sort", sortBy);

      const response = await dashboardService.getCustomers(params.toString());
      setCustomers(response.data || []);
    } catch (error) {
      console.error("Error loading customers:", handleApiError(error));
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedStatus, sortBy]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  /**
   * Abrir formulario para crear nuevo cliente
   */
  const handleCreateCustomer = () => {
    setEditingId(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
    });
    setShowForm(true);
  };

  /**
   * Abrir formulario para editar un cliente
   */
  const handleEditCustomer = (customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      postalCode: customer.postalCode,
    });
    setShowForm(true);
  };

  /**
   * Guardar cliente (crear o actualizar)
   */
  const handleSaveCustomer = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await dashboardService.updateCustomer(editingId, formData);
      } else {
        await dashboardService.createCustomer(formData);
      }

      setShowForm(false);
      loadCustomers();
    } catch (error) {
      console.error("Error saving customer:", handleApiError(error));
      alert("Error saving customer. Please check all fields.");
    }
  };

  /**
   * Eliminar cliente
   */
  const handleDeleteCustomer = async (id) => {
    try {
      await dashboardService.deleteCustomer(id);
      setCustomers(customers.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting customer:", handleApiError(error));
    }
  };

  return (
    <div className="customers-section">
      <div className="customers-header">
        <div>
          <h2>Gestión de Clientes</h2>
          <p>{customers.length} cliente(s) registrado(s)</p>
        </div>
        <button
          className="btn-create-customer"
          onClick={handleCreateCustomer}
        >
          <MdAdd /> Nuevo Cliente
        </button>
      </div>

      <div className="customer-filters">
        <div className="filter-group">
          <label htmlFor="search">
            <MdSearch /> Buscar
          </label>
          <input
            id="search"
            type="text"
            placeholder="Nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="status">
            <MdSort /> Estado
          </label>
          <select
            id="status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Pendiente">Pendiente</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort">
            <MdSort /> Ordenar
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="name">Nombre</option>
            <option value="email">Email</option>
            <option value="spending">Gasto Total</option>
            <option value="purchases">Compras</option>
            <option value="registered">Fecha Registro</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Cargando clientes...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <p>No hay clientes para mostrar</p>
          {searchTerm && " Intenta cambiar los términos de búsqueda."}
          <button className="btn-create-customer" onClick={handleCreateCustomer}>
            <MdAdd /> Nuevo Cliente
          </button>
        </div>
      ) : (
        <div className="customers-table-wrapper">
          <table className="customers-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Gasto Total</th>
                <th>Compras</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.id}</td>
                  <td>{customer.name}</td>
                  <td>{customer.email}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.city}</td>
                  <td>
                    <span
                      className={`status-badge status-${customer.status.toLowerCase()}`}
                    >
                      {customer.status}
                    </span>
                  </td>
                  <td>${customer.totalSpent.toFixed(2)}</td>
                  <td>{customer.purchases}</td>
                  <td>
                    <div className="customer-actions">
                      <button
                        className="btn-action btn-edit"
                        onClick={() => handleEditCustomer(customer)}
                        title="Editar"
                      >
                        <MdEdit />
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => setDeleteConfirm(customer)}
                        title="Eliminar"
                      >
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="customer-form-overlay" onClick={() => setShowForm(false)}>
          <div
            className="customer-form-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{editingId ? "Editar Cliente" : "Nuevo Cliente"}</h3>
            <form onSubmit={handleSaveCustomer}>
              <div className="form-group">
                <label htmlFor="name">Nombre *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Juan García"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="juan@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Teléfono *</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="1234567890"
                  minLength="10"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Dirección</label>
                <input
                  id="address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Calle Principal 123"
                />
              </div>

              <div className="form-group">
                <label htmlFor="city">Ciudad</label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="Madrid"
                />
              </div>

              <div className="form-group">
                <label htmlFor="postalCode">Código Postal</label>
                <input
                  id="postalCode"
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                  placeholder="28001"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingId ? "Actualizar" : "Crear"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="delete-confirm-overlay"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="delete-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Eliminar Cliente</h3>
            <p>
              ¿Estás seguro de que deseas eliminar a{" "}
              <strong>{deleteConfirm.name}</strong>?
            </p>
            <p style={{ fontSize: "12px", color: "#d32f2f", margin: "12px 0" }}>
              Esta acción no se puede deshacer.
            </p>
            <div className="delete-confirm-actions">
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteCustomer(deleteConfirm.id)}
              >
                Eliminar
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersSection;
