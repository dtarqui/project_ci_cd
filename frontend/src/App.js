import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./login";
import Dashboard from "./dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import "./styles.css";
import "./components/ui/ui.css";

function AppRoutes() {
  const { user, loading, login, logout } = useAuth();

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
              <Login onLogin={login} mode="login" />
            )
          }
        />

        <Route
          path="/register"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={login} mode="register" />
            )
          }
        />

        {/* Dashboard Route - Protected */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute isAuthenticated={!!user} user={user}>
              <Dashboard user={user} onLogout={logout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/:section"
          element={
            <ProtectedRoute isAuthenticated={!!user} user={user}>
              <Dashboard user={user} onLogout={logout} />
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

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
