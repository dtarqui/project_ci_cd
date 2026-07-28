import React, { useState } from "react";
import { MdSearch, MdSort, MdEdit, MdDelete, MdAdd, MdPeopleOutline } from "react-icons/md";
import { customerService, handleApiError } from "../services/api";
import useEntityList from "../hooks/useEntityList";
import { useAuth } from "../context/AuthContext";
import CustomerForm from "./CustomerForm";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import Modal from "./ui/Modal";
import EmptyState from "./ui/EmptyState";
import { SkeletonTableRows } from "./ui/Skeleton";
import { formatCurrency } from "../utils/format";
import "../styles/customersActions.css";

const CUSTOMER_STATUS_TONE = {
  activo: "success",
  inactivo: "danger",
  pendiente: "warning",
};

const TABLE_COLUMNS = 9;

const CustomersSection = () => {
  const { user } = useAuth();
  const canDelete = user?.role === "admin";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleCreateCustomer = () => {
    setEditingCustomer(null);
    setFormOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const handleSaveCustomer = async (customerData) => {
    try {
      if (editingCustomer) {
        await customerService.updateCustomer(editingCustomer.id, customerData);
      } else {
        await customerService.createCustomer(customerData);
      }
      setFormOpen(false);
      setEditingCustomer(null);
      loadCustomers();
    } catch (err) {
      throw new Error(handleApiError(err));
    }
  };

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
                    <Badge tone={CUSTOMER_STATUS_TONE[customer.status.toLowerCase()] || "neutral"}>
                      {customer.status}
                    </Badge>
                  </td>
                  <td>{formatCurrency(customer.totalSpent)}</td>
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

      <CustomerForm
        customer={editingCustomer}
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCustomer(null);
        }}
        onSubmit={handleSaveCustomer}
      />

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

export default CustomersSection;
