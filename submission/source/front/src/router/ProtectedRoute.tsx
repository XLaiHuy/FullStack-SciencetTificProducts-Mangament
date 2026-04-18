import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getRole } from '../hooks/useAuth';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const role = getRole();
  if (role !== allowedRole) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
