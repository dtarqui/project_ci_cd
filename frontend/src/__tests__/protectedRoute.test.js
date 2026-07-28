import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";

const renderWithRouter = (ui, initialEntry = "/private") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Página de login</div>} />
        <Route path="/dashboard" element={<div>Página de dashboard</div>} />
        <Route path="/private" element={ui} />
      </Routes>
    </MemoryRouter>
  );

describe("Componente ProtectedRoute", () => {
  it("debe redirigir a /login cuando el usuario no está autenticado", () => {
    renderWithRouter(
      <ProtectedRoute isAuthenticated={false}>
        <div>Contenido protegido</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Página de login")).toBeInTheDocument();
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
  });

  it("debe redirigir a /dashboard cuando el rol no está permitido", () => {
    renderWithRouter(
      <ProtectedRoute
        isAuthenticated
        user={{ role: "vendedor" }}
        allowedRoles={["admin"]}
      >
        <div>Contenido protegido</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Página de dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
  });

  it("debe renderizar el contenido cuando el usuario está autenticado y sin restricción de rol", () => {
    renderWithRouter(
      <ProtectedRoute isAuthenticated user={{ role: "vendedor" }}>
        <div>Contenido protegido</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });

  it("debe renderizar el contenido cuando el rol del usuario está permitido", () => {
    renderWithRouter(
      <ProtectedRoute
        isAuthenticated
        user={{ role: "admin" }}
        allowedRoles={["admin", "vendedor"]}
      >
        <div>Contenido protegido</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });
});
