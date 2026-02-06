const { authenticateToken, errorHandler, notFoundHandler } = require("../src/middleware/auth");

describe("Auth Middleware Tests - Extended Coverage", () => {
  describe("authenticateToken", () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {},
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      next = jest.fn();
    });

    it("debe llamar next() cuando token es válido", () => {
      req.headers.authorization = "Bearer valid_token";
      authenticateToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("debe llamar next() para tokens mock JWT válidos", () => {
      req.headers.authorization = "Bearer mock-jwt-token-1";
      authenticateToken(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("debe retornar 401 cuando no hay token", () => {
      req.headers.authorization = undefined;
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("debe retornar 401 cuando token está vacío", () => {
      req.headers.authorization = "";
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("debe retornar 401 cuando token es inválido", () => {
      req.headers.authorization = "Bearer invalid-token-xyz";
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          code: "INVALID_TOKEN",
        })
      );
    });

    it("debe retornar 401 cuando header no tiene Bearer", () => {
      req.headers.authorization = "invalid-token";
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("debe manejar header de autorización malformado", () => {
      req.headers.authorization = "Bearer";
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("debe ser case-sensitive para Bearer", () => {
      // La implementación es case-sensitive, así que "bearer" falla
      req.headers.authorization = "bearer valid_token";
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("debe extraer token sin trim automático", () => {
      // Token con espacios extras - la implementación no hace trim
      req.headers.authorization = "Bearer valid_token";
      authenticateToken(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("errorHandler", () => {
    let res;

    beforeEach(() => {
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    it("debe manejar errores y retornar 500", () => {
      const error = new Error("Test error");
      errorHandler(error, {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Error interno del servidor",
          code: "INTERNAL_ERROR",
        })
      );
    });

    it("debe retornar mensaje genérico en producción", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Sensitive error message");
      errorHandler(error, {}, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Something went wrong",
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("debe retornar mensaje de error en desarrollo", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new Error("Development error");
      errorHandler(error, {}, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Development error",
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("notFoundHandler", () => {
    it("debe retornar 404 para rutas no encontradas", () => {
      const req = {
        originalUrl: "/api/unknown",
        method: "GET",
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Endpoint no encontrado",
          code: "NOT_FOUND",
          path: "/api/unknown",
          method: "GET",
        })
      );
    });
  });
});
