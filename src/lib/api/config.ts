/**
 * Centralized API configuration for modular, scalable, DRY usage.
 * Uses environment variables for flexibility.
 */

// Determine if we're in a secure context
const isSecureContext = typeof window !== "undefined" && window.isSecureContext;

// Default to HTTPS in production or secure contexts
const defaultProtocol = isSecureContext ? "https:" : "http:";

// Get the API URL from environment variables or construct a default one
const getApiUrl = () => {
  if (typeof window !== "undefined") {
    return (
      import.meta.env.PUBLIC_API_URL ||
      import.meta.env.VITE_API_URL ||
      "/api"
    );
  }
  
  // Server-side URL
  const apiUrl = process.env.PUBLIC_API_URL ||
    process.env.VITE_API_URL ||
    "127.0.0.1:8000/api";
    
  // Ensure URL has protocol
  if (!apiUrl.startsWith("http")) {
    return `${defaultProtocol}//${apiUrl}`;
  }
  return apiUrl;
};

export const apiConfig = {
  baseUrl: getApiUrl(),
  timeout: 30000, // ms
  retryAttempts: 3,
  csrfTokenHeader: "X-CSRFToken",
};
