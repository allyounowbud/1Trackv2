import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { ADMIN_EMAILS, ADMIN_METADATA_KEYS, ADMIN_DATABASE_CONFIG } from '../config/adminConfig';

/**
 * Custom hook for admin functionality
 * Checks if the current user has admin privileges
 */
export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    setIsLoading(true);
    
    try {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      // Method 1: Check if user email is in admin list
      const userEmail = user.email?.toLowerCase();
      const isEmailAdmin = ADMIN_EMAILS.map(email => email.toLowerCase()).includes(userEmail);
      
      console.log('🔍 Admin check:', {
        userEmail,
        isEmailAdmin,
        adminEmails: ADMIN_EMAILS
      });

      // Method 2: Check user metadata for admin role
      const userMetadata = user.user_metadata || {};
      const isMetadataAdmin = Object.entries(ADMIN_METADATA_KEYS).some(([key, value]) => 
        userMetadata[key] === value
      );

      // Method 3: Check database for admin role (if database config is enabled)
      let isDatabaseAdmin = false;
      if (ADMIN_DATABASE_CONFIG.table && ADMIN_DATABASE_CONFIG.column) {
        try {
          const { data: userData, error } = await supabase
            .from(ADMIN_DATABASE_CONFIG.table)
            .select(ADMIN_DATABASE_CONFIG.column)
            .eq('id', user.id)
            .single();

          if (!error && userData) {
            isDatabaseAdmin = userData[ADMIN_DATABASE_CONFIG.column] === true;
          }
        } catch (error) {
          // Database check failed, continue without it
        }
      }

      // User is admin if any method returns true
      const hasAdminAccess = isEmailAdmin || isMetadataAdmin || isDatabaseAdmin;
      
      setIsAdmin(hasAdminAccess);

    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAdmin,
    isLoading,
    checkAdminStatus
  };
}