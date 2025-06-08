/**
 * API Client for the TrustyConvert backend
 *
 * This module provides a type-safe API client with:
 * - Proper error handling
 * - Request/response type validation
 * - Automatic retries for transient errors
 * - CSRF protection
 * - Progress tracking
 */

import { z } from "zod";
import { csrfToken } from "@/lib/stores/session";
import type { TaskStatus, ConversionFormat } from "./types";

// API Response Schemas
export const TaskStatusSchema = z.object({
  task_id: z.string(),
  file_id: z.string(),
  status: z.enum(["idle", "uploading", "processing", "completed", "failed"]),
  progress: z.number().min(0).max(100),
  filename: z.string().optional(),
  error: z.string().optional(),
  error_details: z.record(z.unknown()).optional(),
  download_url: z.string().url().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ConversionFormatSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  maxSize: z.number(),
  features: z.array(z.string()),
  inputFormats: z.array(z.string()),
  outputFormats: z.array(z.string()),
});

export const APIErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

// API Error Classes
export class APIRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "APIRequestError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

// API Client Configuration
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || "/api";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper Functions
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const handleResponse = async <T>(
  response: Response,
  schema: z.ZodType<T>
): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    try {
      const apiError = APIErrorSchema.parse(error);
      throw new APIRequestError(
        apiError.message,
        apiError.code,
        apiError.details
      );
    } catch (e) {
      if (response.status === 400) {
        throw new ValidationError("Invalid request data");
      } else if (response.status === 401) {
        throw new APIRequestError("Unauthorized", "UNAUTHORIZED");
      } else if (response.status === 403) {
        throw new APIRequestError("Forbidden", "FORBIDDEN");
      } else if (response.status === 404) {
        throw new APIRequestError("Resource not found", "NOT_FOUND");
      } else if (response.status >= 500) {
        throw new APIRequestError("Server error", "SERVER_ERROR");
      } else {
        throw new APIRequestError("Unknown error", "UNKNOWN");
      }
    }
  }

  const data = await response.json();
  try {
    return schema.parse(data);
  } catch (error) {
    throw new ValidationError("Invalid response data");
  }
};

/**
 * API Client class for making requests to the backend
 */
export class APIClient {
  private async fetch<T>(
    input: RequestInfo,
    init: RequestInit,
    schema: z.ZodType<T>
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const token = csrfToken.get();
        const response = await fetch(input, {
          ...init,
          headers: {
            ...init.headers,
            "X-CSRF-Token": token || "",
            Accept: "application/json",
          },
        });
        return await handleResponse(response, schema);
      } catch (error) {
        lastError = error as Error;
        if (error instanceof APIRequestError) {
          // Don't retry client errors
          if (error.code.startsWith("4")) throw error;
        }
        if (attempt < MAX_RETRIES - 1) {
          await delay(RETRY_DELAY * Math.pow(2, attempt));
          continue;
        }
      }
    }

    throw lastError || new NetworkError("Request failed");
  }

  /**
   * Start a file conversion task
   */
  async startConversion(
    file: File,
    targetFormat: string,
    onProgress?: (progress: number) => void
  ): Promise<TaskStatus> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_format", targetFormat);

    return this.fetch(
      `${API_BASE_URL}/convert`,
      {
        method: "POST",
        body: formData,
      },
      TaskStatusSchema
    );
  }

  /**
   * Get the status of a conversion task
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    return this.fetch(
      `${API_BASE_URL}/convert/${taskId}/status`,
      { method: "GET" },
      TaskStatusSchema
    );
  }

  /**
   * Get supported conversion formats
   */
  async getSupportedFormats(): Promise<ConversionFormat[]> {
    return this.fetch(
      `${API_BASE_URL}/supported-conversions`,
      { method: "GET" },
      z.array(ConversionFormatSchema)
    );
  }
}

// Export a singleton instance
export const apiClient = new APIClient();
