/**
 * Catalog Repository
 * Acceso a datos de los catalogos administrables: ciudades y categorias.
 *
 * Los dos catalogos tienen la misma forma —un nombre unico, un par de campos
 * propios y borrado logico— y el mismo CRUD. En vez de escribir dos repositorios
 * gemelos que acabarian divergiendo, como ya paso con las hojas de estilo de las
 * secciones, aqui hay uno solo parametrizado por entidad.
 *
 * El borrado es logico por el mismo motivo que en clientes y productos: las
 * filas quedan referenciadas desde datos historicos y destruirlas dejaria
 * registros sin resolver.
 */

const { getMockData } = require("../db/dataStore");
const { getPrismaClient } = require("../db/prismaClient");
const { createRepository } = require("./factory");

/** Definicion de cada catalogo: donde vive y que campos propios tiene. */
const CATALOGOS = {
  cities: {
    coleccion: "cities",
    modelo: "city",
    campos: ["postalPrefix", "areaCode"],
    etiqueta: "La ciudad",
  },
  categories: {
    coleccion: "categories",
    modelo: "category",
    campos: ["description"],
    etiqueta: "La categoria",
  },
};

const estaActivo = (fila) => !fila.deletedAt;

/** Toma del payload solo el nombre y los campos propios del catalogo. */
const soloCamposDe = (definicion, payload) => {
  const datos = {};

  if (payload.name !== undefined) {
    datos.name = String(payload.name).trim();
  }

  for (const campo of definicion.campos) {
    if (payload[campo] !== undefined) {
      const valor = payload[campo];
      datos[campo] = valor === null || valor === "" ? null : String(valor).trim();
    }
  }

  return datos;
};

class InMemoryCatalogRepository {
  constructor(definicion) {
    this.definicion = definicion;
  }

  get filas() {
    return getMockData()[this.definicion.coleccion];
  }

  async list() {
    return this.filas.filter(estaActivo);
  }

  async findById(id) {
    return this.filas.find((fila) => fila.id === id && estaActivo(fila)) || null;
  }

  /** Busca por nombre para rechazar duplicados; ignora mayusculas y espacios. */
  async findByName(name, excluirId = null) {
    const buscado = String(name).trim().toLowerCase();
    return (
      this.filas.find(
        (fila) =>
          estaActivo(fila) &&
          fila.id !== excluirId &&
          fila.name.toLowerCase() === buscado
      ) || null
    );
  }

  async create(payload) {
    const ahora = new Date().toISOString();
    const siguienteId = this.filas.reduce((max, f) => Math.max(max, f.id), 0) + 1;
    const fila = {
      id: siguienteId,
      ...Object.fromEntries(this.definicion.campos.map((c) => [c, null])),
      ...soloCamposDe(this.definicion, payload),
      createdAt: ahora,
      updatedAt: ahora,
      deletedAt: null,
    };

    this.filas.push(fila);
    return fila;
  }

  async update(id, payload) {
    const fila = await this.findById(id);
    if (!fila) return null;

    Object.assign(fila, soloCamposDe(this.definicion, payload), {
      updatedAt: new Date().toISOString(),
    });

    return fila;
  }

  async delete(id) {
    const fila = await this.findById(id);
    if (!fila) return null;

    fila.deletedAt = new Date().toISOString();
    return fila;
  }
}

class DatabaseCatalogRepository {
  constructor(definicion) {
    this.definicion = definicion;
  }

  get modelo() {
    return getPrismaClient()[this.definicion.modelo];
  }

  async list() {
    return this.modelo.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async findById(id) {
    return this.modelo.findFirst({ where: { id, deletedAt: null } });
  }

  async findByName(name, excluirId = null) {
    return this.modelo.findFirst({
      where: {
        name: { equals: String(name).trim(), mode: "insensitive" },
        deletedAt: null,
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
    });
  }

  async create(payload) {
    return this.modelo.create({ data: soloCamposDe(this.definicion, payload) });
  }

  async update(id, payload) {
    const { count } = await this.modelo.updateMany({
      where: { id, deletedAt: null },
      data: soloCamposDe(this.definicion, payload),
    });

    if (count === 0) return null;
    return this.modelo.findUnique({ where: { id } });
  }

  /**
   * Borrado logico condicionado a que siga activa: dos borrados simultaneos no
   * se pisan y el segundo recibe null, igual que en clientes y productos.
   */
  async delete(id) {
    const { count } = await this.modelo.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (count === 0) return null;
    return this.modelo.findUnique({ where: { id } });
  }
}

const createCatalogRepository = (recurso) => {
  const definicion = CATALOGOS[recurso];

  if (!definicion) {
    throw new Error(`Catalogo desconocido: ${recurso}`);
  }

  return createRepository(
    class extends InMemoryCatalogRepository {
      constructor() {
        super(definicion);
      }
    },
    class extends DatabaseCatalogRepository {
      constructor() {
        super(definicion);
      }
    }
  );
};

module.exports = {
  CATALOGOS,
  InMemoryCatalogRepository,
  DatabaseCatalogRepository,
  createCatalogRepository,
};
