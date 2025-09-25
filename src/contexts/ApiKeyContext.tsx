import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ApiKeyContextType {
  apiKey: string;
  updateApiKey: (newApiKey: string) => void;
  clearApiKey: () => void;
  hasApiKey: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const useApiKey = () => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};

interface ApiKeyProviderProps {
  children: ReactNode;
}

export const ApiKeyProvider: React.FC<ApiKeyProviderProps> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    // Load API key from sessionStorage on component mount
    const storedApiKey = sessionStorage.getItem('json2video_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const updateApiKey = (newApiKey: string) => {
    setApiKey(newApiKey);
    if (newApiKey.trim()) {
      sessionStorage.setItem('json2video_api_key', newApiKey.trim());
    } else {
      sessionStorage.removeItem('json2video_api_key');
    }
  };

  const clearApiKey = () => {
    setApiKey('');
    sessionStorage.removeItem('json2video_api_key');
  };

  const value = {
    apiKey,
    updateApiKey,
    clearApiKey,
    hasApiKey: apiKey.trim().length > 0
  };

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
    </ApiKeyContext.Provider>
  );
};