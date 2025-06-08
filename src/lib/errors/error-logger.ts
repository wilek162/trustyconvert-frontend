import type { ApiError } from "./error-types";
import type { ConversionError } from "./error-types";

// Error logging service
class ErrorLogger {
  private static instance: ErrorLogger;
  private readonly isDevelopment = import.meta.env.DEV;

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  logError(error: Error, context?: Record<string, unknown>): void {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // In development, log to console with more details
    if (this.isDevelopment) {
      console.error("Error occurred:", errorInfo);
      return;
    }

    // In production, send to error tracking service
    // TODO: Implement proper error tracking service (e.g., Sentry)
    console.error("Production error:", {
      name: error.name,
      message: error.message,
      ...context,
    });
  }

  logApiError(error: ApiError): void {
    this.logError(error, {
      statusCode: error.statusCode,
      code: error.code,
      details: error.details,
    });
  }

  logConversionError(error: ConversionError): void {
    this.logError(error, {
      taskId: error.taskId,
      status: error.status,
    });
  }
}

export const errorLogger = ErrorLogger.getInstance();
