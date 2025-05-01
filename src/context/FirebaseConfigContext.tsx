
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from "@/hooks/use-toast";

interface FirebaseConfig {
  apiKey: string;
  databaseURL: string;
}

interface FirebaseConfigContextType {
  config: FirebaseConfig;
  updateConfig: (config: FirebaseConfig) => void;
  verifyPassword: (password: string) => boolean;
}

const defaultConfig: FirebaseConfig = {
  apiKey: "AIzaSyCaJJ-2ExS5uGcH7jQ_9jwbHFIKLrj8J54", // Keeping the default API key
  databaseURL: "https://powerverter-pro-default-rtdb.firebaseio.com/",
};

// Admin password
const ADMIN_PASSWORD = "Delight77#";

const FirebaseConfigContext = createContext<FirebaseConfigContextType>({
  config: defaultConfig,
  updateConfig: () => {},
  verifyPassword: () => false,
});

export const useFirebaseConfig = () => useContext(FirebaseConfigContext);

export const FirebaseConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<FirebaseConfig>(defaultConfig);

  // Load configuration from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('firebase_config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Error loading Firebase config:', error);
      toast({
        title: "Error",
        description: "Could not load Firebase configuration",
        variant: "destructive",
      });
    }
  }, []);

  // Update Firebase configuration
  const updateConfig = (newConfig: FirebaseConfig) => {
    // Validate inputs
    if (!newConfig.databaseURL) {
      toast({
        title: "Error",
        description: "Database URL is required",
        variant: "destructive",
      });
      return;
    }

    // Save to localStorage
    try {
      // Make sure the API key is always included from the current config
      const configToSave = {
        ...newConfig,
        apiKey: config.apiKey, // Ensure we keep the existing API key
      };
      
      localStorage.setItem('firebase_config', JSON.stringify(configToSave));
      setConfig(configToSave);
      toast({
        title: "Success",
        description: "Firebase configuration updated",
      });

      // Reload the page to apply new configuration
      window.location.reload();
    } catch (error) {
      console.error('Error saving Firebase config:', error);
      toast({
        title: "Error",
        description: "Could not save Firebase configuration",
        variant: "destructive",
      });
    }
  };

  // Verify admin password
  const verifyPassword = (password: string): boolean => {
    return password === ADMIN_PASSWORD;
  };

  return (
    <FirebaseConfigContext.Provider value={{ config, updateConfig, verifyPassword }}>
      {children}
    </FirebaseConfigContext.Provider>
  );
};
