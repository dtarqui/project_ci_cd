import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { MdAdd, MdClose, MdDelete, MdEdit, MdErrorOutline } from "react-icons/md";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import EmptyState from "./ui/EmptyState";
import { SkeletonTableRows } from "./ui/Skeleton";
import { catalogService, handleApiError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/dataTable.css";
import "../styles/formModal.css";
import "../styles/catalogs.css";

/**
 * Catálogos administrables: ciudades y categorías.
 *
 * Los dos tienen la misma forma —un nombre único y un par de campos propios— y
 * el mismo CRUD, así que se describen en una tabla de definición en vez de
 * escribir dos secciones gemelas. El backend aplica la misma idea: un solo
 * repositorio y un solo controlador parametrizados por recurso.
 *
 * La pantalla solo la ve el administrador. La restricción que cuenta es la del
 * backend, que rechaza la escritura con 403; esto es la cara visible de esa regla.
 */
const CATALOGOS = [
  {
    recurso: "cities",
    etiqueta: "Ciudades",
    singular: "ciudad",
    articulo: "la",
    descripcion:
      "Alimentan el desplegable del formulario de clientes y son los únicos valores que la API acepta en ese campo.",
    campos: [
      { key: "name", label: "Nombre", max: 80, requerido: true },
      { key: "postalPrefix", label: "Prefijo postal", max: 10, ayuda: "Ej: LP" },
      { key: "areaCode", label: "Código de área", max: 10, ayuda: "Ej: 22" },
    ],
  },
  {
    recurso: "categories",
    etiqueta: "Categorías",
    singular: "categoría",
    articulo: "la",
    descripcion:
      "Alimentan el desplegable del formulario de productos y el filtro del listado.",
    campos: [
      { key: "name", label: "Nombre", max: 60, requerido: true },
      { key: "description", label: "Descripción", max: 200 },
    ],
  },
];

const vacio = (definicion) =>
  Object.fromEntries(definicion.campos.map((c) => [c.key, ""]));

/** Mismas reglas que `validateCatalogEntry` en backend/src/utils/validators.js. */
const validar = (definicion, datos) => {
  const errores = {};

  for (const campo of definicion.campos) {
    const valor = (datos[campo.key] || "").trim();

    if (!valor) {
      if (campo.requerido) {
        errores[campo.key] = `${campo.label} es requerido`;
      }
      continue;
    }

    if (valor.length > campo.max) {
      errores[campo.key] = `No puede superar ${campo.max} caracteres`;
    }
  }

  return errores;
};

const CatalogForm = ({ definicion, entrada, onClose, onSubmit }) => {
  const [datos, setDatos] = useState(() => ({
    ...vacio(definicion),
    ...Object.fromEntries(
      definicion.campos.map((c) => [c.key, entrada?.[c.key] ?? ""])
    ),
  }));
  const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState("");

  const editando = Boolean(entrada);
  const titulo = editando
    ? `Editar ${definicion.singular}`
    : `Nueva ${definicion.singular}`;

  const cambiar = (key, valor) => {
    const siguiente = { ...datos, [key]: valor };
    setDatos(siguiente);
    if (tocados[key]) {
      setErrores(validar(definicion, siguiente));
    }
  };

  const salir = (key) => {
    setTocados({ ...tocados, [key]: true });
    setErrores(validar(definicion, datos));
  };

  const enviar = async (event) => {
    event.preventDefault();
    const encontrados = validar(definicion, datos);
    setErrores(encontrados);
    setTocados(
      Object.fromEntries(definicion.campos.map((c) => [c.key, true]))
    );

    if (Object.keys(encontrados).length > 0) {
      return;
    }

    setEnviando(true);
    setErrorGuardado("");

    try {
      await onSubmit(datos);
    } catch (error) {
      setErrorGuardado(handleApiError(error));
      setEnviando(false);
    }
  };

  const errorDe = (key) => (tocados[key] ? errores[key] : "");

  return (
    <div
      className="form-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-form-title"
      onClick={onClose}
    >
      <div className="form-modal" onClick={(event) => event.stopPropagation()}>
        <div className="form-modal-header">
          <h2 className="form-modal-title" id="catalog-form-title">
            {titulo}
          </h2>
          <button
            className="form-modal-close"
            onClick={onClose}
            type="button"
            aria-label="Cerrar formulario"
          >
            <MdClose />
          </button>
        </div>

        <form className="form-modal-body" onSubmit={enviar} noValidate>
          <div className="form-field-row">
            {definicion.campos.map((campo) => (
              <div className="form-field" key={campo.key}>
                <label htmlFor={`catalog-${campo.key}`}>
                  {campo.label}
                  {campo.requerido ? " *" : ""}
                </label>
                <input
                  id={`catalog-${campo.key}`}
                  type="text"
                  value={datos[campo.key]}
                  onChange={(event) => cambiar(campo.key, event.target.value)}
                  onBlur={() => salir(campo.key)}
                  maxLength={campo.max}
                  disabled={enviando}
                  aria-invalid={errorDe(campo.key) ? "true" : undefined}
                  aria-describedby={
                    errorDe(campo.key) ? `catalog-${campo.key}-error` : undefined
                  }
                />
                {/* La pista cede el sitio al error, como en los demás formularios. */}
                {errorDe(campo.key) ? (
                  <span
                    className="field-error"
                    id={`catalog-${campo.key}-error`}
                    role="alert"
                  >
                    <MdErrorOutline aria-hidden="true" />
                    {errorDe(campo.key)}
                  </span>
                ) : (
                  campo.ayuda && <span className="field-hint">{campo.ayuda}</span>
                )}
              </div>
            ))}
          </div>

          {errorGuardado && (
            <div className="form-modal-alert" role="alert">
              {errorGuardado}
            </div>
          )}

          <div className="form-modal-actions">
            <Button type="submit" loading={enviando}>
              {editando ? "Actualizar" : "Crear"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={enviando}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

CatalogForm.propTypes = {
  definicion: PropTypes.shape({
    singular: PropTypes.string.isRequired,
    campos: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        max: PropTypes.number.isRequired,
        requerido: PropTypes.bool,
        ayuda: PropTypes.string,
      })
    ).isRequired,
  }).isRequired,
  entrada: PropTypes.shape({ id: PropTypes.number }),
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

CatalogForm.defaultProps = {
  entrada: null,
};

const CatalogsSection = () => {
  const { user } = useAuth();
  const esAdmin = user?.role === "admin";

  const [activo, setActivo] = useState(CATALOGOS[0].recurso);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const definicion = CATALOGOS.find((c) => c.recurso === activo);

  const cargar = useCallback(async (recurso) => {
    setCargando(true);
    setError("");

    try {
      const respuesta = await catalogService.list(recurso);
      setFilas(respuesta.data || []);
    } catch (err) {
      setError(handleApiError(err));
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (esAdmin) {
      cargar(activo);
    }
  }, [activo, cargar, esAdmin]);

  // El backend rechaza la escritura con 403; esta pantalla no se ofrece siquiera.
  if (!esAdmin) {
    return (
      <div className="catalogs-section">
        <EmptyState
          title="Solo para administradores"
          description="La administración de catálogos está reservada al rol de administrador."
        />
      </div>
    );
  }

  const guardar = async (datos) => {
    const limpio = Object.fromEntries(
      definicion.campos.map((c) => [c.key, (datos[c.key] || "").trim() || null])
    );

    if (enEdicion) {
      await catalogService.update(activo, enEdicion.id, limpio);
    } else {
      await catalogService.create(activo, limpio);
    }

    setFormAbierto(false);
    setEnEdicion(null);
    await cargar(activo);
  };

  const eliminar = async (id) => {
    setEliminando(true);

    try {
      await catalogService.remove(activo, id);
      setPorEliminar(null);
      await cargar(activo);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="catalogs-section">
      <div className="catalogs-header">
        <div>
          <h2>Catálogos</h2>
          <p>Listas que alimentan los formularios. Solo el administrador las edita.</p>
        </div>
        <Button
          icon={<MdAdd />}
          onClick={() => {
            setEnEdicion(null);
            setFormAbierto(true);
          }}
        >
          Nueva {definicion.singular}
        </Button>
      </div>

      <div className="catalog-tabs" role="tablist">
        {CATALOGOS.map((catalogo) => (
          <button
            key={catalogo.recurso}
            type="button"
            role="tab"
            aria-selected={catalogo.recurso === activo}
            className={`catalog-tab ${
              catalogo.recurso === activo ? "active" : ""
            }`.trim()}
            onClick={() => setActivo(catalogo.recurso)}
          >
            {catalogo.etiqueta}
          </button>
        ))}
      </div>

      <p className="catalogs-description">{definicion.descripcion}</p>

      {error && <div className="catalogs-error">{error}</div>}

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {definicion.campos.map((campo) => (
                <th key={campo.key}>{campo.label}</th>
              ))}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <SkeletonTableRows rows={4} columns={definicion.campos.length + 1} />
            ) : (
              filas.map((fila) => (
                <tr key={fila.id}>
                  {definicion.campos.map((campo) => (
                    <td key={campo.key}>{fila[campo.key] || "—"}</td>
                  ))}
                  <td className="catalog-actions">
                    <Button
                      variant="ghost"
                      className="btn-action btn-edit"
                      onClick={() => {
                        setEnEdicion(fila);
                        setFormAbierto(true);
                      }}
                      title={`Editar ${definicion.singular}`}
                      aria-label={`Editar ${fila.name}`}
                    >
                      <MdEdit size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="btn-action btn-delete"
                      onClick={() => setPorEliminar(fila)}
                      title={`Dar de baja ${definicion.singular}`}
                      aria-label={`Dar de baja ${fila.name}`}
                    >
                      <MdDelete size={18} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!cargando && filas.length === 0 && !error && (
        <EmptyState
          title={`Sin ${definicion.etiqueta.toLowerCase()}`}
          description={`Agrega ${definicion.articulo} primera ${definicion.singular} para que aparezca en los formularios.`}
        />
      )}

      {formAbierto && (
        <CatalogForm
          definicion={definicion}
          entrada={enEdicion}
          onClose={() => {
            setFormAbierto(false);
            setEnEdicion(null);
          }}
          onSubmit={guardar}
        />
      )}

      <Modal isOpen={!!porEliminar} onClose={() => setPorEliminar(null)}>
        <h3 className="ui-modal-danger-title">Confirmar baja</h3>
        <p>
          ¿Dar de baja {definicion.articulo} {definicion.singular}{" "}
          <strong>{porEliminar?.name}</strong>? Dejará de ofrecerse en los
          formularios. La baja es lógica: los datos que ya la usan se conservan.
        </p>
        <div className="ui-confirm-actions">
          <Button
            variant="secondary"
            onClick={() => setPorEliminar(null)}
            disabled={eliminando}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={eliminando}
            onClick={() => eliminar(porEliminar.id)}
          >
            Dar de baja
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CatalogsSection;
