import React, { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { authService, setAccessToken } from "../services/api";
import { isNetworkError } from "../utils/offlineSales";

const readSavedUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrateSession = async () => {
      // Las versiones anteriores guardaban el token en localStorage: se descarta.
      localStorage.removeItem("token");

      try {
        // El token de acceso no se guarda: se recupera con la cookie HttpOnly del
        // token de renovacion, que el JavaScript de la pagina no puede leer.
        const response = await authService.refresh();
        if (response?.user?.id) {
          setUser(response.user);
          localStorage.setItem("user", JSON.stringify(response.user));
        } else {
          localStorage.removeItem("user");
        }
      } catch (error) {
        // Sin conexion no se puede renovar la sesion: se conserva el usuario guardado
        // para trabajar sin red (modo sin conexion). Al volver la red, la primera
        // peticion renueva el token; si la sesion ya no es valida, se cierra.
        const savedUser = readSavedUser();
        if (isNetworkError(error) && savedUser?.id) {
          setUser(savedUser);
        } else {
          localStorage.removeItem("user");
        }
      } finally {
        setLoading(false);
      }
    };

    hydrateSession();

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

  const login = (userData, token) => {
    setAccessToken(token);
    setUser(userData);
    // Solo el perfil, para mostrarlo sin conexion; nunca el token.
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem("user");
    // Las lecturas guardadas para trabajar sin conexion no quedan en el
    // dispositivo despues de cerrar sesion (ver webpack.config.js).
    if (typeof window !== "undefined" && window.caches) {
      window.caches.delete("api-lecturas").catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};

export default AuthContext;
