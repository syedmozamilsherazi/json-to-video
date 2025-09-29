import React, { createContext, useContext, useEffect, useState } from 'react';

interface WhopContextType {
  iframeSdk: any;
  isLoaded: boolean;
}

const WhopContext = createContext<WhopContextType | undefined>(undefined);

export const useIframeSdk = () => {
  const context = useContext(WhopContext);
  if (context === undefined) {
    throw new Error('useIframeSdk must be used within a WhopProvider');
  }
  return context.iframeSdk;
};

interface WhopProviderProps {
  children: React.ReactNode;
}

export const WhopProvider: React.FC<WhopProviderProps> = ({ children }) => {
  const [iframeSdk, setIframeSdk] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
  }, []);

  const value = {
    iframeSdk,
    isLoaded,
  };

  return (
    <WhopContext.Provider value={value}>
      {children}
    </WhopContext.Provider>
  );
};