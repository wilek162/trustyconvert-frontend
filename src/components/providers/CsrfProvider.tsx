import React, { createContext, useContext, useState, useCallback } from "react";

interface CsrfContextType {
  csrfToken: string | null;
  setCsrfToken: (token: string) => void;
}

const CsrfContext = createContext<CsrfContextType | undefined>(undefined);

export const CsrfProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [csrfToken, setCsrfTokenState] = useState<string | null>(null);

  const setCsrfToken = useCallback((token: string) => {
    setCsrfTokenState(token);
  }, []);

  return (
    <CsrfContext.Provider value={{ csrfToken, setCsrfToken }}>
      {children}
    </CsrfContext.Provider>
  );
};

export function useCsrf() {
  const context = useContext(CsrfContext);
  if (!context) {
    throw new Error("useCsrf must be used within a CsrfProvider");
  }
  return context;
} 