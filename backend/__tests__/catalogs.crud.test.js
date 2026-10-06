/**
 * CRUD de los catalogos administrables (ciudades y categorias).
 *
 * Lo que importa comprobar aqui: que la escritura esta cerrada a quien no es
 * administrador, que el nombre no se repite y que la baja es logica, de modo que
 * la entrada desaparece del listado sin que la fila se destruya.
 */

const request = require("supertest");
const { createApp } = require("../app");
const { createAuthToken } = require("../src/utils/helpers");
const { resetDataStore } = require("../src/db/dataStore");

describe("Endpoints de catalogos", () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    resetDataStore();
  });

  const tokenAdmin = `Bearer ${createAuthToken(1, { username: "admin", role: "admin" })}`;
  const tokenVendedor = `Bearer ${createAuthToken(2, {
    username: "vendedor",
    role: "vendedor",
  })}`;

  describe.each([
    ["cities", { name: "Trinidad", postalPrefix: "TR", areaCode: "46" }, "La ciudad"],
    ["categories", { name: "Jardinería", description: "Herramientas de jardín" }, "La categoria"],
  ])("/api/catalogs/%s", (recurso, nuevo, etiqueta) => {
    it("lista las entradas a cualquier usuario autenticado", async () => {
      const res = await request(app)
        .get(`/api/catalogs/${recurso}`)
        .set("Authorization", tokenVendedor)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBe(res.body.data.length);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("exige autenticación para listar", async () => {
      await request(app).get(`/api/catalogs/${recurso}`).expect(401);
    });

    it("el administrador crea una entrada", async () => {
      const res = await request(app)
        .post(`/api/catalogs/${recurso}`)
        .set("Authorization", tokenAdmin)
        .send(nuevo)
        .expect(201);

      expect(res.body.data.name).toBe(nuevo.name);
      expect(res.body.data.id).toEqual(expect.any(Number));

      const listado = await request(app)
        .get(`/api/catalogs/${recurso}`)
        .set("Authorization", tokenAdmin);
      expect(listado.body.data.map((f) => f.name)).toContain(nuevo.name);
    });

    it("rechaza la creación a un vendedor", async () => {
      const res = await request(app)
        .post(`/api/catalogs/${recurso}`)
        .set("Authorization", tokenVendedor)
        .send(nuevo)
        .expect(403);

      expect(res.body.code).toBe("FORBIDDEN_ROLE");
    });

    it("rechaza la edición y la baja a un vendedor", async () => {
      const creada = await request(app)
        .post(`/api/catalogs/${recurso}`)
        .set("Authorization", tokenAdmin)
        .send(nuevo)
        .expect(201);

      await request(app)
        .put(`/api/catalogs/${recurso}/${creada.body.data.id}`)
        .set("Authorization", tokenVendedor)
        .send({ name: "Otro nombre" })
        .expect(403);

      await request(app)
        .delete(`/api/catalogs/${recurso}/${creada.body.data.id}`)
        .set("Authorization", tokenVendedor)
        .expect(403);
    });

    it("exige el nombre al crear", async () => {
      const res = await request(app)
        .post(`/api/catalogs/${recurso}`)
        .set("Authorization", tokenAdmin)
        .send({})
        .expect(400);

      expect(res.body.code).toBe("MISSING_FIELD");
    });

    // Sin esto, el desplegable mostraria dos entradas indistinguibles y la de
    // abajo seria inalcanzable.
    it("rechaza un nombre repetido, sin distinguir mayúsculas", async () => {
      await request(app)
        .post(`/api/catalogs/${recurso}`)
        .set("Authorization", tokenAdmin)
        .send(nuevo)
        .expect(201);

      const res = await request(app)
        .post(`/api/catalogs/${recurso}`)
        .set("Authorization", tokenAdmin)
        .send({ ...nuevo, name: nuevo.name.toUpperCase() })
        .expect(409);

      expect(res.body.code).toBe("CATALOG_ENTRY_DUPLICATED");
      expect(res.body.error).toContain(etiqueta);
    });

    it("el administrador edita una entrada", async () => {
      const creada = await request(app)
        .post(`/api/catalogs/${recurso}`)
        .set("Authorization", tokenAdmin)
        .send(nuevo)
        .expect(201);

      const res = await request(app)
        .put(`/api/catalogs/${recurso}/${creada.body.data.id}`)
        .set("Authorization", tokenAdmin)
        .send({ name: "Nombre corregido" })
        .expect(200);

      expect(res.body.data.name).toBe("Nombre corregido");
    });

    it("al editar, el nombre propio no cuenta como repetido", async () => {
      const creada = await request(app)
        .post(`/api/catalogs/${recurso}`)
        .set("Authorization", tokenAdmin)
        .send(nuevo)
        .expect(201);

      await request(app)
        .put(`/api/catalogs/${recurso}/${creada.body.data.id}`)
        .set("Authorization", tokenAdmin)
        .send({ name: nuevo.name })
        .expect(200);
    });

    it("la baja es lógica: desaparece del listado", async () => {
      const creada = await request(app)
        .post(`/api/catalogs/${recurso}`)
        .set("Authorization", tokenAdmin)
        .send(nuevo)
        .expect(201);

      await request(app)
        .delete(`/api/catalogs/${recurso}/${creada.body.data.id}`)
        .set("Authorization", tokenAdmin)
        .expect(200);

      const listado = await request(app)
        .get(`/api/catalogs/${recurso}`)
        .set("Authorization", tokenAdmin);
      expect(listado.body.data.map((f) => f.id)).not.toContain(creada.body.data.id);

      // Y un segundo intento ya no la encuentra.
      await request(app)
        .delete(`/api/catalogs/${recurso}/${creada.body.data.id}`)
        .set("Authorization", tokenAdmin)
        .expect(404);
    });

    it("responde 404 al editar una entrada inexistente", async () => {
      const res = await request(app)
        .put(`/api/catalogs/${recurso}/9999`)
        .set("Authorization", tokenAdmin)
        .send({ name: "Inexistente" })
        .expect(404);

      expect(res.body.code).toBe("CATALOG_ENTRY_NOT_FOUND");
    });
  });

  // El catalogo de ciudades es el que alimenta el formulario de clientes, de modo
  // que lo que el admin agregue tiene que quedar aceptado por la API de clientes.
  describe("Las ciudades alimentan el formulario de clientes", () => {
    it("GET /api/customers/cities sirve el catálogo", async () => {
      const res = await request(app)
        .get("/api/customers/cities")
        .set("Authorization", tokenVendedor)
        .expect(200);

      expect(res.body.data.map((c) => c.name)).toContain("La Paz");
    });

    it("una ciudad recién creada se acepta al registrar un cliente", async () => {
      await request(app)
        .post("/api/catalogs/cities")
        .set("Authorization", tokenAdmin)
        .send({ name: "Trinidad", postalPrefix: "TR", areaCode: "46" })
        .expect(201);

      const res = await request(app)
        .post("/api/customers")
        .set("Authorization", tokenAdmin)
        .send({
          name: "Cliente de Trinidad",
          email: "trinidad@correo.com",
          phone: "46123456",
          city: "Trinidad",
        })
        .expect(201);

      expect(res.body.data.city).toBe("Trinidad");
    });

    it("una ciudad que no está en el catálogo se rechaza", async () => {
      const res = await request(app)
        .post("/api/customers")
        .set("Authorization", tokenAdmin)
        .send({
          name: "Cliente de ningún sitio",
          email: "ninguno@correo.com",
          phone: "22123456",
          city: "Macondo",
        })
        .expect(400);

      expect(res.body.code).toBe("INVALID_CITY");
    });
  });
});
