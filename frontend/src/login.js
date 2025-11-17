import React, { useState } from "react";
import { authService } from "./services/api";

export default function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpiar error al escribir
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError("Por favor ingresa usuario y contraseña");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await authService.login(credentials);
      const { user, token } = data;
      onLogin(user, token);
    } catch (error) {
      setError(
        error.response?.data?.error ||
          "Error al iniciar sesión. Por favor intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setCredentials({
      username: "demo",
      password: "demo123",
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Mi Tienda</h1>
          <h2>Bienvenido a mi tienda online</h2>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-section">
            <h3>Inicio de sesión</h3>

            <div className="form-group">
              <input
                type="text"
                name="username"
                placeholder="Usuario"
                value={credentials.username}
                onChange={handleChange}
                className="form-input"
                disabled={loading}
                aria-label="Usuario"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <div className="password-container">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Contraseña"
                  value={credentials.password}
                  onChange={handleChange}
                  className="form-input"
                  disabled={loading}
                  aria-label="Contraseña"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <div className="forgot-password">
              <button type="button" className="forgot-link">
                ¿Olvidé mi contraseña?
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>

            <div className="demo-section">
              <p>Prueba la demo:</p>
              <button
                type="button"
                className="demo-button"
                onClick={handleDemoLogin}
                disabled={loading}
              >
                Llenar datos de demo
              </button>
            </div>
          </div>
        </form>

        {/* <div className="login-footer">
          <p>Usuarios de prueba:</p>
          <ul>
            <li><strong>admin</strong> / admin123</li>
            <li><strong>demo</strong> / demo123</li>
            <li><strong>test</strong> / test123</li>
          </ul>
        </div> */}
      </div>
    </div>
  );
}
