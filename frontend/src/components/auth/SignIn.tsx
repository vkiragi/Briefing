import React from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SignIn = () => {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="space-y-2">
          <p className="text-accent font-semibold text-sm uppercase tracking-wide">Welcome</p>
          <h1 className="text-3xl font-bold">Sign in to Briefing</h1>
          <p className="text-gray-400 text-sm">
            Continue with Google to access your bets, analytics, and bankroll tracking.
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-black font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.3)] transition-all duration-200 disabled:opacity-60"
        >
          <LogIn size={20} />
          {loading ? 'Checking session...' : 'Sign in with Google'}
        </button>

        <p className="text-xs text-gray-500">
          You will be redirected to Google and sent back to this app after sign in.
        </p>
      </div>
    </div>
  );
};

