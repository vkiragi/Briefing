import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

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

    // Handle deep link callback from OAuth (native only)
    const handleDeepLink = async (url: string) => {
      if (!url.includes('auth/callback')) return;

      // Parse tokens from the URL fragment
      const hashIndex = url.indexOf('#');
      if (hashIndex === -1) return;

      const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Failed to set session from deep link:', error);
        } else if (isMounted) {
          setSession(data?.session ?? null);
        }

        // Close the in-app browser
        await Browser.close();
      }
    };

    // Listen for app URL open events (native)
    let appUrlListener: { remove: () => void } | undefined;
    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', ({ url }) => {
        handleDeepLink(url);
      }).then((listener) => {
        appUrlListener = listener;
      });
    }

    const initAuth = async () => {
      // Set up auth state listener
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setLoading(false);
      });

      // Check if we have hash params (OAuth callback) - for web
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        // Manually set the session from URL params
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('Failed to set session from URL:', error);
        } else {
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
      appUrlListener?.remove();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const isNative = Capacitor.isNativePlatform();

      // Use custom URL scheme for native apps, web origin for browser
      const redirectTo = isNative
        ? 'com.briefing.app://auth/callback'
        : `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: isNative, // Don't auto-redirect on native
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

      // On native, open the OAuth URL in the in-app browser
      if (isNative && data?.url) {
        await Browser.open({ url: data.url });
      }
    } catch (err) {
      console.error('Sign in error:', err);
      // Show error on native for debugging
      if (Capacitor.isNativePlatform()) {
        alert(`Sign in error: ${err instanceof Error ? err.message : String(err)}`);
      }
      throw err;
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

