import React from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Redirects to /login if user is not authenticated
 */
const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
