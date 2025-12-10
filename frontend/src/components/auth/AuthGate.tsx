import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { SignIn } from './SignIn';

export const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-sm text-gray-400">Checking your session...</div>
      </div>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  return <>{children}</>;
};

