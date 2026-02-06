import React, { useState } from "react";
import {
  MdAccountCircle,
  MdNotifications,
  MdSecurity,
  MdInfo,
  MdSave,
  MdCancel,
  MdEdit,
  MdCheckCircle,
  MdErrorOutline,
} from "react-icons/md";
import "../styles/settings.css";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [passwordError, setPasswordError] = useState("");

  // Profile Form State
  const [profileData, setProfileData] = useState({
    name: "Usuario Demo",
    email: "demo@example.com",
    username: "demo",
    phone: "+591 XXXXXXXX",
    location: "La Paz, Bolivia",
  });

  // Notifications State
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    orderUpdates: true,
    promotions: false,
    weeklyReport: true,
  });

  // Security State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Preferences State
  const [preferences, setPreferences] = useState({
    language: "es",
    currency: "Bs.",
    theme: "light",
    dateFormat: "DD/MM/YYYY",
  });

  // ==================== PROFILE HANDLERS ====================
  const handleProfileChange = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveProfile = () => {
    setSaveStatus({
      type: "success",
      message: "Perfil guardado correctamente",
    });
    setIsEditing(false);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleCancelProfile = () => {
    setIsEditing(false);
    setProfileData({
      name: "Usuario Demo",
      email: "demo@example.com",
      username: "demo",
      phone: "+591 XXXXXXXX",
      location: "La Paz, Bolivia",
    });
  };

  // ==================== NOTIFICATIONS HANDLERS ====================
  const handleNotificationToggle = (field) => {
    setNotifications((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
    setSaveStatus({ type: "success", message: "Preferencias actualizadas" });
    setTimeout(() => setSaveStatus(null), 2000);
  };

  // ==================== PASSWORD HANDLERS ====================
  const handlePasswordChange = (field, value) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setPasswordError("");
  };

  const handleChangePassword = () => {
    // Validations
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setPasswordError("Todos los campos son requeridos");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    // Simulate password change
    setSaveStatus({
      type: "success",
      message: "Contraseña actualizada correctamente",
    });
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // ==================== PREFERENCES HANDLERS ====================
  const handlePreferenceChange = (field, value) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaveStatus({ type: "success", message: "Preferencias guardadas" });
    setTimeout(() => setSaveStatus(null), 2000);
  };

  // ==================== RENDER FUNCTIONS ====================
  const renderProfileTab = () => (
    <div className="settings-section">
      <div className="section-header">
        <h3>
          <MdAccountCircle /> Información de Perfil
        </h3>
        {!isEditing && (
          <button className="btn-edit" onClick={() => setIsEditing(true)}>
            <MdEdit /> Editar
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="form-group">
          <div className="form-row">
            <div className="form-field">
              <label>Nombre Completo</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => handleProfileChange("name", e.target.value)}
                className="input-field"
              />
            </div>
            <div className="form-field">
              <label>Usuario</label>
              <input
                type="text"
                value={profileData.username}
                disabled
                className="input-field disabled"
              />
              <small>No se puede modificar</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => handleProfileChange("email", e.target.value)}
                className="input-field"
              />
            </div>
            <div className="form-field">
              <label>Teléfono</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => handleProfileChange("phone", e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="form-field">
            <label>Ubicación</label>
            <input
              type="text"
              value={profileData.location}
              onChange={(e) => handleProfileChange("location", e.target.value)}
              className="input-field"
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSaveProfile}>
              <MdSave /> Guardar Cambios
            </button>
            <button className="btn-secondary" onClick={handleCancelProfile}>
              <MdCancel /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="profile-info">
          <div className="info-row">
            <span className="info-label">Nombre:</span>
            <span className="info-value">{profileData.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Usuario:</span>
            <span className="info-value">{profileData.username}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value">{profileData.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Teléfono:</span>
            <span className="info-value">{profileData.phone}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Ubicación:</span>
            <span className="info-value">{profileData.location}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="settings-section">
      <h3>
        <MdNotifications /> Preferencias de Notificaciones
      </h3>
      <p className="section-description">
        Controla cómo y cuándo deseas recibir notificaciones
      </p>

      <div className="notification-settings">
        {Object.entries(notifications).map(([key, value]) => (
          <div key={key} className="notification-item">
            <div className="notification-content">
              <label htmlFor={key}>{getLabelForNotification(key)}</label>
              <p className="notification-desc">
                {getDescriptionForNotification(key)}
              </p>
            </div>
            <label className="toggle-switch">
              <input
                id={key}
                type="checkbox"
                checked={value}
                onChange={() => handleNotificationToggle(key)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="settings-section">
      <div className="section-header">
        <h3>
          <MdSecurity /> Seguridad
        </h3>
      </div>

      <div className="security-container">
        <div className="password-change">
          <h4>Cambiar Contraseña</h4>
          <p className="section-description">
            Actualiza tu contraseña de forma regular para mantener tu cuenta
            segura
          </p>

          {passwordError && (
            <div className="alert alert-error">
              <MdErrorOutline /> {passwordError}
            </div>
          )}

          <div className="form-field">
            <label>Contraseña Actual</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                handlePasswordChange("currentPassword", e.target.value)
              }
              className="input-field"
              placeholder="Ingresa tu contraseña actual"
            />
          </div>

          <div className="form-field">
            <label>Nueva Contraseña</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                handlePasswordChange("newPassword", e.target.value)
              }
              className="input-field"
              placeholder="Ingresa tu nueva contraseña"
            />
            <small>Mínimo 6 caracteres</small>
          </div>

          <div className="form-field">
            <label>Confirmar Nueva Contraseña</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                handlePasswordChange("confirmPassword", e.target.value)
              }
              className="input-field"
              placeholder="Confirma tu nueva contraseña"
            />
          </div>

          <button className="btn-primary" onClick={handleChangePassword}>
            <MdSave /> Actualizar Contraseña
          </button>
        </div>

        <div className="security-info">
          <h4>Información de Seguridad</h4>
          <div className="info-box">
            <p>
              <strong>Último cambio de contraseña:</strong> Hace 3 meses
            </p>
          </div>
          <div className="info-box">
            <p>
              <strong>Dispositivos autenticados:</strong> 1 dispositivo
            </p>
          </div>
          <div className="info-box alert alert-info">
            <p>
              💡 Por seguridad, recomendamos cambiar tu contraseña cada 3 meses
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="settings-section">
      <h3>
        <MdNotifications /> Preferencias de Aplicación
      </h3>

      <div className="preferences-grid">
        <div className="preference-item">
          <label htmlFor="language">Idioma</label>
          <select
            id="language"
            value={preferences.language}
            onChange={(e) => handlePreferenceChange("language", e.target.value)}
            className="select-field"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="pt">Português</option>
          </select>
        </div>

        <div className="preference-item">
          <label htmlFor="currency">Moneda</label>
          <select
            id="currency"
            value={preferences.currency}
            onChange={(e) => handlePreferenceChange("currency", e.target.value)}
            className="select-field"
          >
            <option value="Bs.">Bolivianos (Bs.)</option>
            <option value="USD">Dólares (USD)</option>
            <option value="EUR">Euros (EUR)</option>
          </select>
        </div>

        <div className="preference-item">
          <label htmlFor="theme">Tema</label>
          <select
            id="theme"
            value={preferences.theme}
            onChange={(e) => handlePreferenceChange("theme", e.target.value)}
            className="select-field"
          >
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
            <option value="auto">Automático</option>
          </select>
        </div>

        <div className="preference-item">
          <label htmlFor="dateFormat">Formato de Fecha</label>
          <select
            id="dateFormat"
            value={preferences.dateFormat}
            onChange={(e) =>
              handlePreferenceChange("dateFormat", e.target.value)
            }
            className="select-field"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderInfoTab = () => (
    <div className="settings-section">
      <h3>
        <MdInfo /> Información del Sistema
      </h3>

      <div className="info-cards">
        <div className="info-card">
          <h4>Versión de la Aplicación</h4>
          <p className="info-value">v1.0.0</p>
        </div>

        <div className="info-card">
          <h4>Última Actualización</h4>
          <p className="info-value">5 de Febrero de 2026</p>
        </div>

        <div className="info-card">
          <h4>Base de Datos</h4>
          <p className="info-value">Sincronizada</p>
        </div>

        <div className="info-card">
          <h4>Almacenamiento Local</h4>
          <p className="info-value">234 MB / 1 GB</p>
        </div>
      </div>

      <div className="support-section">
        <h4>Soporte y Ayuda</h4>
        <div className="support-links">
          <a href="#documentation" className="support-link">
            📚 Documentación
          </a>
          <a href="#contact" className="support-link">
            📧 Contactar Soporte
          </a>
          <a href="#faq" className="support-link">
            ❓ Preguntas Frecuentes
          </a>
          <a href="#terms" className="support-link">
            ⚖️ Términos de Servicio
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Configuraciones</h1>
        <p>Administra tu perfil, preferencias y configuración de seguridad</p>
      </div>

      {saveStatus && (
        <div className={`alert alert-${saveStatus.type}`}>
          {saveStatus.type === "success" && <MdCheckCircle />}
          {saveStatus.type === "error" && <MdErrorOutline />}
          {saveStatus.message}
        </div>
      )}

      <div className="settings-tabs">
        <div className="tabs-header">
          <button
            className={`tab-button ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <MdAccountCircle /> Perfil
          </button>
          <button
            className={`tab-button ${activeTab === "notifications" ? "active" : ""}`}
            onClick={() => setActiveTab("notifications")}
          >
            <MdNotifications /> Notificaciones
          </button>
          <button
            className={`tab-button ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <MdSecurity /> Seguridad
          </button>
          <button
            className={`tab-button ${activeTab === "preferences" ? "active" : ""}`}
            onClick={() => setActiveTab("preferences")}
          >
            <MdNotifications /> Preferencias
          </button>
          <button
            className={`tab-button ${activeTab === "info" ? "active" : ""}`}
            onClick={() => setActiveTab("info")}
          >
            <MdInfo /> Información
          </button>
        </div>

        <div className="tabs-content">
          {activeTab === "profile" && renderProfileTab()}
          {activeTab === "notifications" && renderNotificationsTab()}
          {activeTab === "security" && renderSecurityTab()}
          {activeTab === "preferences" && renderPreferencesTab()}
          {activeTab === "info" && renderInfoTab()}
        </div>
      </div>
    </div>
  );
};

// ==================== HELPER FUNCTIONS ====================
function getLabelForNotification(key) {
  const labels = {
    emailNotifications: "Notificaciones por Email",
    pushNotifications: "Notificaciones Push",
    orderUpdates: "Actualizaciones de Pedidos",
    promotions: "Ofertas y Promociones",
    weeklyReport: "Reporte Semanal",
  };
  return labels[key] || key;
}

function getDescriptionForNotification(key) {
  const descriptions = {
    emailNotifications:
      "Recibe notificaciones importantes por correo electrónico",
    pushNotifications: "Notificaciones en tiempo real en tu dispositivo",
    orderUpdates: "Mantente informado sobre el estado de tus pedidos",
    promotions: "Descubre ofertas especiales y promociones",
    weeklyReport: "Recibe un resumen semanal de tu actividad",
  };
  return descriptions[key] || "";
}

export default Settings;
