import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./login";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import "./styles.css";
import "./components/ui/ui.css";

// El tablero y sus graficos (Recharts) se descargan solo despues de iniciar
// sesion: la pantalla de acceso deja de cargar la aplicacion completa (antes,
// unos 143 kB de JavaScript que esa pantalla no usaba).
const Dashboard = lazy(() => import("./dashboard"));

function PageLoader() {
  return (
    <div className="loading-container" role="status">
      <div className="loading-spinner"></div>
      <p>Cargando...</p>
    </div>
  );
}

function AppRoutes() {
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
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
