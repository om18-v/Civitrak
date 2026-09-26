import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import type { UserRole } from '../../types';

interface RoleGateProps {
  allowed: UserRole[];
  children: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ allowed, children }) => {
  const { currentRole } = useApp();
  const location = useLocation();
  const destination = currentRole === 'USER' ? '/citizen' : currentRole === 'AUTHORITY' ? '/authority' : '/contractor';
  if (currentRole === 'GUEST') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!allowed.includes(currentRole)) return <Navigate to={destination} replace />;
  return <>{children}</>;
};
