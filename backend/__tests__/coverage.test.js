const request = require("supertest");
const { createApp, mockData, users } = require("../app");

describe("Additional API Coverage Tests", () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe("Authentication Edge Cases", () => {
    test("should fail with valid format but non-existent user token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer mock-jwt-token-999")
        .expect(401);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: "Token inválido",
          code: "INVALID_TOKEN",
        })
      );
    });

    test("should fail with zero user ID token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer mock-jwt-token-0")
        .expect(401);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: "Token inválido",
          code: "INVALID_TOKEN",
        })
      );
    });

    test("should handle negative user ID token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer mock-jwt-token--1")
        .expect(401);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: "Token inválido", 
          code: "INVALID_TOKEN",
        })
      );
    });
  });

  describe("Login Edge Cases", () => {
    test("should handle very long usernames", async () => {
      const longUsername = "a".repeat(1000);
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: longUsername,
          password: "demo123",
        })
        .expect(401);

      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    });

    test("should handle special characters in credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "admin<script>alert('xss')</script>",
          password: "admin123",
        })
        .expect(401);

      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    });

    test("should handle null username", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: null,
          password: "demo123",
        })
        .expect(400);

      expect(response.body.code).toBe("MISSING_CREDENTIALS");
    });

    test("should handle null password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "demo",
          password: null,
        })
        .expect(400);

      expect(response.body.code).toBe("MISSING_CREDENTIALS");
    });

    test("should handle number as username", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: 12345,
          password: "demo123",
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });

    test("should handle number as password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "demo",
          password: 12345,
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });

    test("should handle boolean as username", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: true,
          password: "demo123",
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });

    test("should handle boolean as password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "demo",
          password: false,
        })
        .expect(400);

      expect(response.body.code).toBe("MISSING_CREDENTIALS");
    });

    test("should handle object as username", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: { name: "demo" },
          password: "demo123",
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });

    test("should handle object as password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "demo",
          password: { pass: "demo123" },
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });

    test("should handle array as username", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: ["demo"],
          password: "demo123",
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });

    test("should handle array as password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "demo",
          password: ["demo123"],
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });
  });

  describe("Dashboard Data Edge Cases", () => {
    test("should handle malformed Bearer token in dashboard", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer invalid-format-token")
        .expect(401);

      expect(response.body.code).toBe("INVALID_TOKEN");
    });

    test("should handle non-existent user in dashboard token", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer mock-jwt-token-9999")
        .expect(200);

      expect(response.body).toHaveProperty("dailySales");
    });

    test("should handle zero user ID in dashboard token", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer mock-jwt-token-0")
        .expect(200);

      expect(response.body).toHaveProperty("dailySales");
    });
  });

  describe("Additional Security Tests", () => {
    test("should handle empty string credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "",
          password: "",
        })
        .expect(400);

      expect(response.body.code).toBe("MISSING_CREDENTIALS");
    });

    test("should handle whitespace-only credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "   ",
          password: "   ",
        })
        .expect(401);

      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    });

    test("should handle mixed whitespace credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: " demo ",
          password: " demo123 ",
        })
        .expect(401);

      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("Stress and Performance Tests", () => {
    test("should handle rapid successive login attempts", async () => {
      const credentials = { username: "demo", password: "demo123" };
      
      const requests = Array(5).fill().map(() => 
        request(app).post("/api/auth/login").send(credentials)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test("should handle rapid dashboard requests with different tokens", async () => {
      const tokens = ["mock-jwt-token-1", "mock-jwt-token-2", "mock-jwt-token-3"];
      
      const requests = tokens.map(token => 
        request(app)
          .get("/api/dashboard/data")
          .set("Authorization", `Bearer ${token}`)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("dailySales");
      });
    });
  });

  describe("Data Validation Tests", () => {
    test("should return consistent dashboard data structure", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer mock-jwt-token-1")
        .expect(200);

      expect(response.body).toMatchObject({
        dailySales: expect.any(String),
        branchSales: expect.any(Array),
        salesTrend: expect.any(Array),
        productSales: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    test("should return valid timestamp in dashboard data", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer mock-jwt-token-1")
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test("should return consistent user data structure in auth/me", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer mock-jwt-token-1")
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        user: expect.objectContaining({
          id: expect.any(Number),
          username: expect.any(String),
          name: expect.any(String),
        }),
      });

      // Should not include password
      expect(response.body.user.password).toBeUndefined();
    });
  });
});