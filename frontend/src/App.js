import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./login";
import Dashboard from "./dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { authService } from "./services/api";
import "./styles.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrateSession = async () => {
      const savedToken = localStorage.getItem("token");

      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await authService.getMe();
        if (response?.user?.id) {
          setUser(response.user);
          localStorage.setItem("user", JSON.stringify(response.user));
        } else {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
      } catch (_error) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };

    // Verificar si hay una sesión guardada
    hydrateSession();

    // Escuchar evento de no autorizado (401)
    const handleUnauthorized = () => {
      setUser(null);
    };

    const handleUserUpdated = (event) => {
      if (event?.detail?.id) {
        setUser(event.detail);
      }
    };

    window.addEventListener("unauthorized", handleUnauthorized);
    window.addEventListener("user-updated", handleUserUpdated);
    return () => {
      window.removeEventListener("unauthorized", handleUnauthorized);
      window.removeEventListener("user-updated", handleUserUpdated);
    };
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={handleLogin} mode="login" />
            )
          }
        />

        <Route
          path="/register"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={handleLogin} mode="register" />
            )
          }
        />

        {/* Dashboard Route - Protected */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute isAuthenticated={!!user}>
              <Dashboard user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/:section"
          element={
            <ProtectedRoute isAuthenticated={!!user}>
              <Dashboard user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* Root - Redirect to dashboard or login */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Catch-all - Redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
