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
        // Create a mock iframe SDK for now since the real one has issues
        const mockIframeSdk = {
          inAppPurchase: async ({ planId }: { planId: string }) => {
            try {
              // For now, redirect to Whop checkout page
              const checkoutUrl = `https://whop.com/checkout/${planId}?redirect_url=${encodeURIComponent(window.location.href)}`;
              
              // Open in popup or redirect
              const popup = window.open(checkoutUrl, 'whop-checkout', 'width=600,height=700');
              
              // Listen for completion
              return new Promise((resolve) => {
                const checkClosed = setInterval(() => {
                  if (popup?.closed) {
                    clearInterval(checkClosed);
                    resolve({ status: 'success', token: 'temp-token' });
                  }
                }, 1000);
              });
            } catch (error) {
              return { status: 'error', error: error.message };
            }
          }
        };
        
        setIframeSdk(mockIframeSdk);
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