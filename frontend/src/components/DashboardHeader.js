import React from "react";
import PropTypes from "prop-types";
import { MdAccountCircle } from "react-icons/md";

const DashboardHeader = ({ user, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const handleLogout = async () => {
    setShowUserMenu(false);
    onLogout();
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1>Mi Tienda</h1>
      </div>
      <div className="header-right">
        <div className="user-menu">
          <button
            className="user-button"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <MdAccountCircle />
          </button>
          {showUserMenu && (
            <div className="user-dropdown">
              <div className="user-info">
                {user?.name && <small className="user-name">{user.name}</small>}
              </div>
              <button onClick={handleLogout} className="logout-button">
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

DashboardHeader.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    username: PropTypes.string,
  }),
  onLogout: PropTypes.func.isRequired,
};

export default DashboardHeader;
