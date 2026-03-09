const request = require("supertest");
const { createApp } = require("../app");
const { resetInMemoryUserRepository } = require("../src/repositories/userRepository");

describe("Users registration and profile CRUD", () => {
  let app;

  beforeEach(() => {
    resetInMemoryUserRepository();
    app = createApp();
  });

  it("debe registrar usuario nuevo con token y sin password en respuesta", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        username: "new_user",
        password: "StrongPass1",
        name: "Nuevo Usuario",
        email: "new.user@email.com",
        phone: "+591 70000001",
        city: "La Paz",
        country: "Bolivia",
        address: "Av. Principal 123",
        postalCode: "LP-100",
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.user.username).toBe("new_user");
    expect(response.body.user.phone).toBe("+591 70000001");
    expect(response.body.user.city).toBe("La Paz");
    expect(response.body.user.country).toBe("Bolivia");
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.body.token).toEqual(expect.any(String));
  });

  it("debe evitar registro con username duplicado", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        username: "new_user",
        password: "StrongPass1",
        name: "Nuevo Usuario",
        email: "new.user@email.com",
      })
      .expect(201);

    const duplicate = await request(app)
      .post("/api/auth/register")
      .send({
        username: "new_user",
        password: "StrongPass1",
        name: "Otro Usuario",
        email: "other.user@email.com",
      })
      .expect(409);

    expect(duplicate.body.code).toBe("USERNAME_TAKEN");
  });

  it("debe evitar registro con email duplicado", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        username: "first_email_user",
        password: "StrongPass1",
        name: "Primer Usuario",
        email: "same.email@email.com",
      })
      .expect(201);

    const duplicateEmail = await request(app)
      .post("/api/auth/register")
      .send({
        username: "second_email_user",
        password: "StrongPass1",
        name: "Segundo Usuario",
        email: "same.email@email.com",
      })
      .expect(409);

    expect(duplicateEmail.body.code).toBe("EMAIL_TAKEN");
  });

  it("debe obtener y actualizar perfil propio", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({
        username: "profile_user",
        password: "StrongPass1",
        name: "Perfil Usuario",
        email: "profile.user@email.com",
        phone: "+591 70000002",
        city: "Cochabamba",
        country: "Bolivia",
      })
      .expect(201);

    const token = register.body.token;

    const meResponse = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(meResponse.body.user.username).toBe("profile_user");
    expect(meResponse.body.user.phone).toBe("+591 70000002");

    const updateResponse = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Perfil Actualizado",
        email: "profile.user.updated@email.com",
        phone: "+591 70000003",
        city: "Santa Cruz",
        state: "Andres Ibanez",
        country: "Bolivia",
        postalCode: "SC-200",
        dateOfBirth: "1997-04-15",
      })
      .expect(200);

    expect(updateResponse.body.user.name).toBe("Perfil Actualizado");
    expect(updateResponse.body.user.email).toBe("profile.user.updated@email.com");
    expect(updateResponse.body.user.phone).toBe("+591 70000003");
    expect(updateResponse.body.user.city).toBe("Santa Cruz");
    expect(updateResponse.body.user.dateOfBirth).toBe("1997-04-15");
  });

  it("debe rechazar metadata inválida", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        username: "invalid_meta",
        password: "StrongPass1",
        name: "Meta Invalida",
        email: "invalid.meta@email.com",
        phone: "bad-phone",
      })
      .expect(400);

    const register = await request(app)
      .post("/api/auth/register")
      .send({
        username: "valid_meta",
        password: "StrongPass1",
        name: "Meta Valida",
        email: "valid.meta@email.com",
      })
      .expect(201);

    await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${register.body.token}`)
      .send({
        dateOfBirth: "2999-01-01",
      })
      .expect(400);
  });

  it("debe exigir contraseña actual para cambiar password", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({
        username: "pwd_user",
        password: "StrongPass1",
        name: "Password User",
        email: "pwd.user@email.com",
      })
      .expect(201);

    const token = register.body.token;

    const badUpdate = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        password: "OtherStrong2",
      })
      .expect(400);

    expect(badUpdate.body.code).toBe("MISSING_CURRENT_PASSWORD");

    await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        password: "OtherStrong2",
        currentPassword: "StrongPass1",
      })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({ username: "pwd_user", password: "OtherStrong2" })
      .expect(200);
  });

  it("debe eliminar la cuenta solo con contraseña actual válida", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({
        username: "delete_user",
        password: "StrongPass1",
        name: "Delete User",
        email: "delete.user@email.com",
      })
      .expect(201);

    const token = register.body.token;

    await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "BadPassword1" })
      .expect(401);

    await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "StrongPass1" })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({ username: "delete_user", password: "StrongPass1" })
      .expect(401);
  });
});
