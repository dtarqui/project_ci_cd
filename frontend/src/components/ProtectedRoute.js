import React from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication.
 * Redirects to /login if user is not authenticated, and to /dashboard if
 * allowedRoles is provided and user.role is not included in it.
 */
const ProtectedRoute = ({ isAuthenticated, user, allowedRoles, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  user: PropTypes.shape({
    role: PropTypes.string,
  }),
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
