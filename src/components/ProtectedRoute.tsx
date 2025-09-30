import React from 'react';
import { Navigate } from 'react-router-dom';
import { useWhop } from '@/contexts/WhopContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoaded, isCheckingAccess, hasAccess } = useWhop();

  if (!isLoaded || isCheckingAccess) {
    return <div className="p-8">Checking access…</div>;
  }

  if (!hasAccess) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

