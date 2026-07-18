import React, { useState } from "react";
import PropTypes from "prop-types";
import { MdSearch, MdSort, MdEdit, MdDelete, MdAdd, MdPeopleOutline } from "react-icons/md";
import { customerService, handleApiError } from "../services/api";
import useEntityList from "../hooks/useEntityList";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import Modal from "./ui/Modal";
import EmptyState from "./ui/EmptyState";
import { SkeletonTableRows } from "./ui/Skeleton";
import "../styles/customersActions.css";

const STATUS_TONE = {
  activo: "success",
  inactivo: "danger",
  pendiente: "warning",
};

const TABLE_COLUMNS = 9;

const CustomersSection = ({ user }) => {
  const canDelete = user?.role === "admin";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
  });

  const {
    items: customers,
    setItems: setCustomers,
    loading,
    reload: loadCustomers,
  } = useEntityList(customerService.getCustomers, {
    search: searchTerm,
    status: selectedStatus,
    sort: sortBy,
  });

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
    setIsSaving(true);

    try {
      if (editingId) {
        await customerService.updateCustomer(editingId, formData);
      } else {
        await customerService.createCustomer(formData);
      }

      setShowForm(false);
      loadCustomers();
    } catch (error) {
      console.error("Error saving customer:", handleApiError(error));
      alert("Error saving customer. Please check all fields.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Eliminar cliente
   */
  const handleDeleteCustomer = async (id) => {
    setIsDeleting(true);

    try {
      await customerService.deleteCustomer(id);
      setCustomers(customers.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting customer:", handleApiError(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const tableHead = (
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
  );

  return (
    <div className="customers-section">
      <div className="customers-header">
        <div>
          <h2>Gestión de Clientes</h2>
          <p>{customers.length} cliente(s) registrado(s)</p>
        </div>
        <Button className="btn-create-customer" onClick={handleCreateCustomer} icon={<MdAdd />}>
          Nuevo Cliente
        </Button>
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
        <div className="customers-table-wrapper">
          <table className="customers-table">
            {tableHead}
            <tbody>
              <SkeletonTableRows rows={5} columns={TABLE_COLUMNS} />
            </tbody>
          </table>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={<MdPeopleOutline />}
          description={`No hay clientes para mostrar${
            searchTerm ? " Intenta cambiar los términos de búsqueda." : ""
          }`}
          action={
            <Button className="btn-create-customer" onClick={handleCreateCustomer} icon={<MdAdd />}>
              Nuevo Cliente
            </Button>
          }
        />
      ) : (
        <div className="customers-table-wrapper">
          <table className="customers-table">
            {tableHead}
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.id}</td>
                  <td>{customer.name}</td>
                  <td>{customer.email}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.city}</td>
                  <td>
                    <Badge tone={STATUS_TONE[customer.status.toLowerCase()] || "neutral"}>
                      {customer.status}
                    </Badge>
                  </td>
                  <td>${customer.totalSpent.toFixed(2)}</td>
                  <td>{customer.purchases}</td>
                  <td>
                    <div className="customer-actions">
                      <Button
                        variant="ghost"
                        className="btn-action btn-edit"
                        onClick={() => handleEditCustomer(customer)}
                        title="Editar"
                      >
                        <MdEdit />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          className="btn-action btn-delete"
                          onClick={() => setDeleteConfirm(customer)}
                          title="Eliminar"
                        >
                          <MdDelete />
                        </Button>
                      )}
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
                <Button type="submit" loading={isSaving}>
                  {editingId ? "Actualizar" : "Crear"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <h3 className="ui-modal-danger-title">Eliminar Cliente</h3>
        <p>
          ¿Estás seguro de que deseas eliminar a{" "}
          <strong>{deleteConfirm?.name}</strong>?
        </p>
        <p className="delete-confirm-warning">
          Esta acción no se puede deshacer.
        </p>
        <div className="delete-confirm-actions">
          <Button
            variant="danger"
            loading={isDeleting}
            onClick={() => handleDeleteCustomer(deleteConfirm.id)}
          >
            Eliminar
          </Button>
          <Button
            variant="secondary"
            onClick={() => setDeleteConfirm(null)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
        </div>
      </Modal>
    </div>
  );
};

CustomersSection.propTypes = {
  user: PropTypes.shape({
    role: PropTypes.string,
  }),
};

export default CustomersSection;
