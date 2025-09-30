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
      const hasAccessParam = urlParams.get('has_access');
      
      if (token) {
        // Store the session token in a cookie (cross-device accessible)
        document.cookie = `whop_session=${token}; path=/; max-age=2592000; SameSite=Strict`; // 30 days
        if (userId) {
          document.cookie = `whop_user_id=${userId}; path=/; max-age=2592000; SameSite=Strict`;
        }
        if (hasAccessParam) {
          // Store readable access flag for UI (backend sets HttpOnly cookies we cannot read)
          document.cookie = `whop_has_access_client=${hasAccessParam}; path=/; max-age=2592000; SameSite=Strict`;
          document.cookie = `whop_logged_in_client=true; path=/; max-age=2592000; SameSite=Strict`;
        }
        
        // Clean URL
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      
      // Check for existing session (try different cookie names for compatibility)
      const sessionToken = getCookie('whop_session') || getCookie('whop_access_token');
      const storedUserId = getCookie('whop_user_id');
      const hasAccessCookie = getCookie('whop_has_access_client') || getCookie('whop_has_access');
      const loggedInCookie = getCookie('whop_logged_in_client') || getCookie('whop_logged_in');
      
      // If we have a logged in cookie but no session token, user might be logged in via new system
      if (loggedInCookie === 'true' && hasAccessCookie) {
        console.log('Found new-style authentication cookies');
        setHasAccess(hasAccessCookie === 'true');
        if (storedUserId) {
          setUser({ id: storedUserId });
        }
        setIsCheckingAccess(false);
        return;
      }
      
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
        } else if (result.error === 'Invalid session' || result.expired) {
          // Only clear session if it's truly invalid, not just lack of access
          console.log('Session is invalid or expired, clearing cookies');
          clearSession();
        } else {
          // User is authenticated but doesn't have access - keep the session but no access
          console.log('User is authenticated but has no active subscription');
          setHasAccess(false);
          if (result.user) {
            setUser({
              id: storedUserId || result.user?.id || 'unknown',
              email: result.user?.email,
              username: result.user?.username,
              avatar_url: result.user?.avatar_url
            });
          }
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
    // Clear all possible authentication cookies
    document.cookie = 'whop_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'whop_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'whop_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'whop_has_access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'whop_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setUser(null);
    setHasAccess(false);
  };
  
  const login = () => {
    console.log('Starting OAuth flow via backend initialization...');
    
    // Use the backend OAuth initialization endpoint
    // This ensures proper SDK integration and state management
    const currentPath = window.location.pathname;
    const initUrl = `/api/oauth/init?next=${encodeURIComponent(currentPath)}`;
    
    console.log('Redirecting to OAuth init endpoint:', initUrl);
    console.log('Current path for post-login redirect:', currentPath);
    
    // Redirect to the backend OAuth initialization
    window.location.href = initUrl;
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
              // Always return to OAuth init so we can create a session and then land on the generator
              const baseUrl = window.location.origin;
              const oauthInitUrl = `${baseUrl}/api/oauth/init?next=${encodeURIComponent('/generate')}`;
              const successUrl = oauthInitUrl;
              const cancelUrl = window.location.href;
              const checkoutUrl = `https://whop.com/checkout/${planId}?return_url=${encodeURIComponent(successUrl)}&success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;
              
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