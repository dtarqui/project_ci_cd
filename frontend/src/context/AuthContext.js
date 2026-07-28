import React, { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { authService } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
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
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
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
