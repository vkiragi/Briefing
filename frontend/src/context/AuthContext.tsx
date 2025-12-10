import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // Set up auth state listener
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!isMounted) return;
        console.log('Auth state changed:', event, newSession?.user?.email);
        setSession(newSession);
        setLoading(false);
      });

      // Check if we have hash params (OAuth callback)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        console.log('Found tokens in URL, setting session...');
        // Manually set the session from URL params
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('Failed to set session from URL:', error);
        } else {
          console.log('Session set successfully:', data.session?.user?.email);
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
        }
        if (isMounted) {
          setSession(data?.session ?? null);
          setLoading(false);
        }
      } else {
        // No hash params, check for existing session
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Failed to fetch session', error);
        }
        console.log('Initial session check:', data.session?.user?.email || 'no session');
        if (isMounted) {
          setSession(data.session);
          setLoading(false);
        }
      }

      return listener;
    };

    let listenerCleanup: { subscription: { unsubscribe: () => void } } | undefined;
    initAuth().then((listener) => {
      listenerCleanup = listener;
    });

    return () => {
      isMounted = false;
      listenerCleanup?.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      console.error('Google sign-in failed', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign-out failed', error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

