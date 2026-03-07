import React, { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { authService } from "./services/api";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";

export default function Login({ onLogin, mode }) {
  const navigate = useNavigate();
  const isRegisterMode = mode === "register";

  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    if (isRegisterMode) {
      if (
        !credentials.username.trim() ||
        !credentials.password.trim() ||
        !credentials.name.trim() ||
        !credentials.email.trim()
      ) {
        setError("Completa username, nombre, email y contraseña");
        return;
      }

      if (credentials.password !== credentials.confirmPassword) {
        setError("Las contraseñas no coinciden");
        return;
      }
    } else if (!credentials.username.trim() || !credentials.password.trim()) {
      setError("Por favor ingresa usuario y contraseña");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = isRegisterMode
        ? {
            username: credentials.username.trim(),
            password: credentials.password,
            name: credentials.name.trim(),
            email: credentials.email.trim(),
          }
        : {
            username: credentials.username,
            password: credentials.password,
          };

      const data = isRegisterMode
        ? await authService.register(payload)
        : await authService.login(payload);

      const { user, token } = data;
      onLogin(user, token);
    } catch (error) {
      setError(
        error.response?.data?.error ||
          (isRegisterMode
            ? "Error al crear tu cuenta. Por favor intenta nuevamente."
            : "Error al iniciar sesión. Por favor intenta nuevamente."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setCredentials((prev) => ({
      ...prev,
      username: "demo",
      password: "demo123",
      confirmPassword: "",
    }));
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Mi Tienda</h1>
          <h2>
            {isRegisterMode
              ? "Crea tu cuenta"
              : "Bienvenido a mi tienda online"}
          </h2>
        </div>

        <div
          className="auth-mode-switch"
          role="tablist"
          aria-label="Modo de autenticación"
        >
          <button
            type="button"
            className={`mode-button ${!isRegisterMode ? "active" : ""}`}
            onClick={() => navigate("/login")}
            disabled={loading}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={`mode-button ${isRegisterMode ? "active" : ""}`}
            onClick={() => navigate("/register")}
            disabled={loading}
          >
            Registrarme
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-section">
            {isRegisterMode && (
              <>
                <div className="form-group">
                  <input
                    type="text"
                    name="name"
                    placeholder="Nombre completo"
                    value={credentials.name}
                    onChange={handleChange}
                    className="form-input"
                    disabled={loading}
                    aria-label="Nombre completo"
                    autoComplete="name"
                  />
                </div>

                <div className="form-group">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={credentials.email}
                    onChange={handleChange}
                    className="form-input"
                    disabled={loading}
                    aria-label="Email"
                    autoComplete="email"
                  />
                </div>
              </>
            )}

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
                  {showPassword ? <MdVisibility /> : <MdVisibilityOff />}
                </button>
              </div>
            </div>

            {isRegisterMode && (
              <>
                <div className="form-group">
                  <div className="password-container">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirmar contraseña"
                      value={credentials.confirmPassword}
                      onChange={handleChange}
                      className="form-input"
                      disabled={loading}
                      aria-label="Confirmar contraseña"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <MdVisibility />
                      ) : (
                        <MdVisibilityOff />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {!isRegisterMode && (
              <div className="forgot-password">
                <button type="button" className="forgot-link">
                  ¿Olvidé mi contraseña?
                </button>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading
                ? isRegisterMode
                  ? "Creando cuenta..."
                  : "Ingresando..."
                : isRegisterMode
                  ? "Crear cuenta"
                  : "Ingresar"}
            </button>

            {!isRegisterMode && (
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
            )}
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

Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(["login", "register"]),
};

Login.defaultProps = {
  mode: "login",
};
