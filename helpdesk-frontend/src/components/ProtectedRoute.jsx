// src/components/ProtectedRoute.jsx
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { isAdminRole } from '../utils/roleUtils';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { auth } = useContext(AuthContext);
  const location = useLocation();
  
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  const requiredRolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  // Use currentRole if available, otherwise fall back to user.role
  const effectiveRole = auth.user.currentRole || auth.user.role;
  
  // Check if the user's effective role is included in the required roles
  if (requiredRolesArray.length > 0 && !requiredRolesArray.includes(effectiveRole)) {
    // If not authorized, redirect to their current role's dashboard
    if (effectiveRole === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (isAdminRole(effectiveRole)) {
      return <Navigate to="/subadmin" replace />;
    } else if (effectiveRole === 'resolver') {
      return <Navigate to="/resolver" replace />;
    } else if (effectiveRole === 'user') {
      return <Navigate to="/dashboard" replace />;
    }
    // Fallback if role is not recognized
    return <Navigate to="/login" replace />; 
  }
  
  return children;
};

export default ProtectedRoute;