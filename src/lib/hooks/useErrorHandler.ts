import { useState, useCallback } from "react";

import { ApiError, NetworkError, ValidationError , errorLogger } from "@/lib/errors";


interface ErrorState {
  message: string;
  code?: string;
  field?: string;
  severity: "error" | "warning" | "info";
  timestamp: number;
}

export function useErrorHandler() {
  const [error, setError] = useState<ErrorState | null>(null);

  const handleError = useCallback((error: unknown) => {
    let errorState: ErrorState;

    if (error instanceof ApiError) {
      errorState = {
        message: error.message,
        code: error.code,
        severity: "error",
        timestamp: Date.now(),
      };
      errorLogger.logApiError(error);
    } else if (error instanceof NetworkError) {
      errorState = {
        message:
          "Network connection error. Please check your internet connection.",
        code: "NETWORK_ERROR",
        severity: "error",
        timestamp: Date.now(),
      };
      errorLogger.logError(error);
    } else if (error instanceof ValidationError) {
      errorState = {
        message: error.message,
        field: error.field,
        code: "VALIDATION_ERROR",
        severity: "warning",
        timestamp: Date.now(),
      };
      errorLogger.logError(error);
    } else if (error instanceof Error) {
      errorState = {
        message: error.message,
        code: "UNKNOWN_ERROR",
        severity: "error",
        timestamp: Date.now(),
      };
      errorLogger.logError(error);
    } else {
      errorState = {
        message: "An unexpected error occurred.",
        code: "UNKNOWN_ERROR",
        severity: "error",
        timestamp: Date.now(),
      };
      errorLogger.logError(new Error("Unknown error type"));
    }

    setError(errorState);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const showError = useCallback(
    (message: string, options?: Partial<ErrorState>) => {
      setError({
        message,
        severity: "error",
        timestamp: Date.now(),
        ...options,
      });
    },
    []
  );

  return {
    error,
    handleError,
    clearError,
    showError,
  };
}
