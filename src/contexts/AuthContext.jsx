import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { useAuth };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // If no supabase client, just set loading to false
        if (!supabase) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else if (session) {
          if (isMounted) {
            setUser(session.user);
          }
        }

        if (isMounted) {
          setLoading(false);
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!isMounted) return;

            console.log('Auth state change:', event, session?.user?.email || 'No user');
            
            setUser(session?.user ?? null);
            
            // Only set loading to false after initial load
            if (event !== 'INITIAL_SESSION') {
              setLoading(false);
            }
          }
        );

        // Cleanup function
        return () => {
          isMounted = false;
          mountedRef.current = false;
          subscription?.unsubscribe();
        };

      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const cleanup = initializeAuth();

    return () => {
      isMounted = false;
      mountedRef.current = false;
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(cleanupFn => cleanupFn && cleanupFn());
      }
    };
  }, []);

  const signIn = async (email, password) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signUp = async (email, password) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { data, error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signInWithDiscord = async () => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      return { data, error };
    } catch (error) {
      console.error('Discord sign in error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }
    
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithDiscord,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
