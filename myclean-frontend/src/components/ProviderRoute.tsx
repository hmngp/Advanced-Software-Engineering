// Component to protect provider routes and redirect to profile setup if incomplete
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProviderProfile } from '../hooks/useProviderProfile';

interface ProviderRouteProps {
  children: React.ReactNode;
  allowIncomplete?: boolean; // Set to true for profile-setup route itself
}

const ProviderRoute: React.FC<ProviderRouteProps> = ({ children, allowIncomplete = false }) => {
  const { user, loading: authLoading } = useAuth();
  const { profileComplete, loading: profileLoading } = useProviderProfile();

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'PROVIDER') {
    return <Navigate to="/dashboard" replace />;
  }

  // If profile is incomplete and this route doesn't allow incomplete profiles, redirect to setup
  if (!allowIncomplete && profileComplete === false) {
    return <Navigate to="/provider/profile-setup" replace />;
  }

  return <>{children}</>;
};

export default ProviderRoute;

