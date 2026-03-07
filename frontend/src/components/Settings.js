import React, { useEffect, useState } from "react";
import {
  MdAccountCircle,
  MdSave,
  MdCancel,
  MdEdit,
  MdCheckCircle,
  MdErrorOutline,
} from "react-icons/md";
import { userService } from "../services/api";
import "../styles/settings.css";

const Settings = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileSnapshot, setProfileSnapshot] = useState(null);

  // Profile Form State
  const [profileData, setProfileData] = useState({
    id: null,
    name: "",
    email: "",
    username: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    dateOfBirth: "",
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const mapUserToProfileForm = (user = {}) => ({
    id: user.id || null,
    name: user.name || "",
    email: user.email || "",
    username: user.username || "",
    phone: user.phone || "",
    address: user.address || "",
    city: user.city || "",
    state: user.state || "",
    country: user.country || "",
    postalCode: user.postalCode || "",
    dateOfBirth: user.dateOfBirth || "",
  });

  const loadUserProfile = async () => {
    setLoadingProfile(true);

    try {
      const response = await userService.getMyProfile();
      const mappedProfile = mapUserToProfileForm(response.user);
      setProfileData(mappedProfile);
      setProfileSnapshot(mappedProfile);
    } catch (error) {
      setSaveStatus({
        type: "error",
        message: error.response?.data?.error || "No se pudo cargar tu perfil",
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  // ==================== PROFILE HANDLERS ====================
  const handleProfileChange = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      const payload = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone || undefined,
        address: profileData.address || undefined,
        city: profileData.city || undefined,
        state: profileData.state || undefined,
        country: profileData.country || undefined,
        postalCode: profileData.postalCode || undefined,
        dateOfBirth: profileData.dateOfBirth || undefined,
      };

      const response = await userService.updateMyProfile(payload);
      const updatedProfile = mapUserToProfileForm(response.user);

      setProfileData(updatedProfile);
      setProfileSnapshot(updatedProfile);
      setIsEditing(false);

      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        const mergedUser = { ...parsedUser, ...response.user };
        localStorage.setItem("user", JSON.stringify(mergedUser));
        window.dispatchEvent(new CustomEvent("user-updated", { detail: mergedUser }));
      } else {
        window.dispatchEvent(new CustomEvent("user-updated", { detail: response.user }));
      }

      setSaveStatus({
        type: "success",
        message: "Perfil guardado correctamente",
      });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus({
        type: "error",
        message: error.response?.data?.error || "No se pudo guardar el perfil",
      });
    }
  };

  const handleCancelProfile = () => {
    setIsEditing(false);

    if (profileSnapshot) {
      setProfileData(profileSnapshot);
    }
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

      {loadingProfile ? (
        <p className="section-description">Cargando perfil...</p>
      ) : isEditing ? (
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
            <label>Dirección</label>
            <input
              type="text"
              value={profileData.address}
              onChange={(e) => handleProfileChange("address", e.target.value)}
              className="input-field"
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Ciudad</label>
              <input
                type="text"
                value={profileData.city}
                onChange={(e) => handleProfileChange("city", e.target.value)}
                className="input-field"
              />
            </div>
            <div className="form-field">
              <label>Estado / Provincia</label>
              <input
                type="text"
                value={profileData.state}
                onChange={(e) => handleProfileChange("state", e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>País</label>
              <input
                type="text"
                value={profileData.country}
                onChange={(e) => handleProfileChange("country", e.target.value)}
                className="input-field"
              />
            </div>
            <div className="form-field">
              <label>Código Postal</label>
              <input
                type="text"
                value={profileData.postalCode}
                onChange={(e) => handleProfileChange("postalCode", e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="form-field">
            <label>Fecha de Nacimiento</label>
            <input
              type="date"
              value={profileData.dateOfBirth}
              onChange={(e) => handleProfileChange("dateOfBirth", e.target.value)}
              className="input-field"
              max={new Date().toISOString().split("T")[0]}
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
            <span className="info-value">{profileData.phone || "No definido"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Dirección:</span>
            <span className="info-value">{profileData.address || "No definida"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Ciudad:</span>
            <span className="info-value">{profileData.city || "No definida"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Estado / Provincia:</span>
            <span className="info-value">{profileData.state || "No definido"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">País:</span>
            <span className="info-value">{profileData.country || "No definido"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Código Postal:</span>
            <span className="info-value">{profileData.postalCode || "No definido"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Fecha de Nacimiento:</span>
            <span className="info-value">{profileData.dateOfBirth || "No definida"}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Perfil</h1>
        <p>Administra tu información personal y completa tus datos de contacto.</p>
      </div>

      {saveStatus && (
        <div className={`alert alert-${saveStatus.type}`}>
          {saveStatus.type === "success" && <MdCheckCircle />}
          {saveStatus.type === "error" && <MdErrorOutline />}
          {saveStatus.message}
        </div>
      )}

      <div className="settings-tabs">
        <div className="tabs-content">{renderProfileTab()}</div>
      </div>
    </div>
  );
};

export default Settings;
