import React, { createContext, useContext, useEffect, useState } from 'react';

interface WhopUser {
  id: string;
  email?: string;
  username?: string;
  avatar_url?: string;
}

interface WhopContextType {
  iframeSdk: any;
  isLoaded: boolean;
  user: WhopUser | null;
  hasAccess: boolean;
  isCheckingAccess: boolean;
  login: () => void;
  logout: () => void;
  refreshAccess: () => Promise<void>;
}

const WhopContext = createContext<WhopContextType | undefined>(undefined);

export const useIframeSdk = () => {
  const context = useContext(WhopContext);
  if (context === undefined) {
    throw new Error('useIframeSdk must be used within a WhopProvider');
  }
  return context.iframeSdk;
};

export const useWhop = () => {
  const context = useContext(WhopContext);
  if (context === undefined) {
    throw new Error('useWhop must be used within a WhopProvider');
  }
  return context;
};

interface WhopProviderProps {
  children: React.ReactNode;
}

export const WhopProvider: React.FC<WhopProviderProps> = ({ children }) => {
  const [iframeSdk, setIframeSdk] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<WhopUser | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Check if user is authenticated via URL params or stored session
  const checkAuthStatus = async () => {
    setIsCheckingAccess(true);
    try {
      // Check for authentication token in URL (after redirect from Whop)
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || urlParams.get('access_token');
      const userId = urlParams.get('user_id');
      
      if (token) {
        // Store the session token in a cookie (cross-device accessible)
        document.cookie = `whop_session=${token}; path=/; max-age=2592000; SameSite=Strict`; // 30 days
        if (userId) {
          document.cookie = `whop_user_id=${userId}; path=/; max-age=2592000; SameSite=Strict`;
        }
        
        // Clean URL
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      
      // Check for existing session
      const sessionToken = getCookie('whop_session');
      const storedUserId = getCookie('whop_user_id');
      
      if (sessionToken) {
        // Verify session with backend
        const response = await fetch('/api/check-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: sessionToken })
        });
        
        const result = await response.json();
        
        if (result.hasAccess) {
          setHasAccess(true);
          setUser({
            id: storedUserId || result.user?.id || 'unknown',
            email: result.user?.email,
            username: result.user?.username,
            avatar_url: result.user?.avatar_url
          });
        } else {
          // Invalid session, clear cookies
          clearSession();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearSession();
    }
    setIsCheckingAccess(false);
  };
  
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };
  
  const clearSession = () => {
    document.cookie = 'whop_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'whop_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setUser(null);
    setHasAccess(false);
  };
  
  const login = () => {
    // Redirect to Whop OAuth login
    const baseUrl = window.location.origin;
    const whopAppId = import.meta.env.VITE_PUBLIC_WHOP_APP_ID;
    
    if (!whopAppId) {
      console.error('VITE_PUBLIC_WHOP_APP_ID not found in environment variables');
      alert('OAuth configuration error. Please check environment variables.');
      return;
    }
    
    const authUrl = `https://api.whop.com/v5/oauth/authorize?client_id=${whopAppId}&response_type=code&redirect_uri=${encodeURIComponent(baseUrl + '/api/auth/callback')}&scope=user:read+subscriptions:read`;
    console.log('Redirecting to OAuth URL:', authUrl);
    window.location.href = authUrl;
  };
  
  const logout = () => {
    clearSession();
    window.location.reload();
  };
  
  const refreshAccess = async () => {
    await checkAuthStatus();
  };

  useEffect(() => {
    // Load Whop iframe SDK dynamically
    const loadWhopSdk = async () => {
      try {
        // Create a proper Whop SDK implementation
        const whopSdk = {
          inAppPurchase: async ({ planId }: { planId: string }) => {
            try {
              // Use the correct Whop checkout URL format
              const baseUrl = window.location.origin;
              const checkoutUrl = `https://whop.com/checkout/${planId}?return_url=${encodeURIComponent(baseUrl)}`;
              
              // Redirect directly to Whop checkout (this is the standard flow)
              window.location.href = checkoutUrl;
              
              // Return immediately since we're redirecting
              return { status: 'redirect' };
            } catch (error: any) {
              return { status: 'error', error: error.message };
            }
          }
        };
        
        setIframeSdk(whopSdk);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load Whop SDK:', error);
        setIsLoaded(true); // Still set to true to avoid infinite loading
      }
    };

    loadWhopSdk();
    checkAuthStatus();
  }, []);

  const value = {
    iframeSdk,
    isLoaded,
    user,
    hasAccess,
    isCheckingAccess,
    login,
    logout,
    refreshAccess,
  };

  return (
    <WhopContext.Provider value={value}>
      {children}
    </WhopContext.Provider>
  );
};