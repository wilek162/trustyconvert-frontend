import { ApiError, NetworkError, errorLogger } from "@/lib/errors";
import { withRetry } from "@/lib/retry";
import { getCookie, setCookie } from "@/lib/cookies";
import { apiConfig } from "@/lib/api/config";
import type {
  ApiConfig,
  ApiResponse,
  ApiErrorResponse,
  ConversionTask,
  ConversionFormat,
  TaskStatus,
  UploadProgressCallback,
  TaskStatusCallback,
  ErrorCallback,
} from "./types";

export class ApiClient {
  private static instance: ApiClient;
  private config: ApiConfig;
  private csrfToken: string | null = null;

  private constructor(config: ApiConfig) {
    this.config = {
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      csrfTokenHeader: "X-CSRFToken",
      ...config,
    };
  }

  static getInstance(config: ApiConfig): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(config);
    }
    return ApiClient.instance;
  }

  setCsrfToken(token: string) {
    this.csrfToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    const headers = new Headers(options.headers);

    // Add CSRF token for state-changing requests
    if (
      options.method &&
      ["POST", "PUT", "DELETE", "PATCH"].includes(options.method.toUpperCase())
    ) {
      if (this.csrfToken && this.config.csrfTokenHeader) {
        headers.set(this.config.csrfTokenHeader, this.csrfToken);
      }
    }

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: "include", // Always include credentials for session cookie
        mode: "cors", // Explicitly set CORS mode
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle response
      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        throw new ApiError(
          errorData.error || "API request failed",
          response.status,
          errorData.code || "UNKNOWN_ERROR",
          errorData.details
        );
      }

      const data = await response.json();
      return data as ApiResponse<T>;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new NetworkError("Network request failed");
      }
      throw error;
    }
  }

  private async withRetryWrapper<T>(fn: () => Promise<T>): Promise<T> {
    return withRetry(fn, {
      maxAttempts: this.config.retryAttempts,
      shouldRetry: (error) =>
        error instanceof NetworkError ||
        (error instanceof ApiError && error.statusCode >= 500),
    });
  }

  // API Methods
  async initializeSession(): Promise<string> {
    try {
      const response = await fetch("https://127.0.0.1/api/session/init", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(
          "Session initialization failed: " + response.statusText
        );
      }
      const data = await response.json();
      // Expecting { data: { csrf_token: string }, success: true }
      if (data && data.data && data.data.csrf_token) {
        this.setCsrfToken(data.data.csrf_token);
        return data.data.csrf_token;
      }
      throw new Error("No CSRF token in session init response");
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: "Session initialization",
        code: "SESSION_INIT_FAILED",
      });
      throw error;
    }
  }

  async getSupportedFormats(): Promise<ConversionFormat[]> {
    try {
      const response = await this.withRetryWrapper(() =>
        this.request<ConversionFormat[]>(
          "/supported-conversions"
        )
      );
      // Response is { data: ConversionFormat[], success: true }
      return response.data;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: "Fetching supported formats",
        code: "FORMATS_FETCH_FAILED",
      });
      throw error;
    }
  }

  async convertFile(
    file: File,
    targetFormat: string,
    onProgress?: UploadProgressCallback
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target_format", targetFormat);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(
              xhr.responseText
            );
            resolve(response);
          } catch (error) {
            reject(
              new ApiError(
                "Invalid response format",
                xhr.status,
                "INVALID_RESPONSE",
                { responseText: xhr.responseText }
              )
            );
          }
        } else {
          let errorData;
          try {
            errorData = JSON.parse(xhr.responseText);
          } catch {
            errorData = { message: xhr.statusText };
          }
          reject(
            new ApiError(
              errorData.message || "Upload failed",
              xhr.status,
              "UPLOAD_FAILED",
              errorData
            )
          );
        }
      });

      xhr.addEventListener("error", () => {
        reject(new NetworkError("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(
          new ApiError("Upload aborted", 0, "UPLOAD_ABORTED", {
            reason: "User aborted upload",
          })
        );
      });

      xhr.open(
        "POST",
        `${this.config.baseUrl}/convert?target_format=${encodeURIComponent(targetFormat)}`
      );
      // Add CSRF token from memory if available (must be after open)
      if (this.csrfToken) {
        xhr.setRequestHeader("X-CSRFToken", this.csrfToken);
      }
      xhr.send(formData);
    });
  }

  async getTaskStatus(taskId: string): Promise<any> {
    try {
      const response = await this.withRetryWrapper(() =>
        this.request<any>(`/convert/${taskId}/status`)
      );
      return response;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: "Checking task status",
        taskId,
        code: "TASK_STATUS_FAILED",
      });
      throw error;
    }
  }

  async downloadFile(taskId: string): Promise<Blob> {
    try {
      const headers: HeadersInit = {};
      if (this.csrfToken && this.config.csrfTokenHeader) {
        headers[this.config.csrfTokenHeader] = this.csrfToken;
      }

      const response = await fetch(
        `${this.config.baseUrl}/convert/${taskId}/download`,
        {
          credentials: "include",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        throw new ApiError(
          errorData.error || "Download failed",
          response.status,
          errorData.code || "DOWNLOAD_FAILED",
          errorData.details
        );
      }

      return response.blob();
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: "File download",
        taskId,
        code: "DOWNLOAD_FAILED",
      });
      throw error;
    }
  }

  pollTaskStatus(
    taskId: string,
    onStatusUpdate: TaskStatusCallback,
    onError: ErrorCallback,
    interval: number = 2000
  ): () => void {
    let isPolling = true;

    const poll = async () => {
      if (!isPolling) return;

      try {
        const status = await this.getTaskStatus(taskId);
        if (!status || typeof status.status === 'undefined') {
          onError(new Error('Task status is undefined'));
          isPolling = false;
          return;
        }
        onStatusUpdate(status);

        if (status.status === "completed" || status.status === "failed") {
          isPolling = false;
          return;
        }

        setTimeout(poll, interval);
      } catch (error) {
        isPolling = false;
        onError(error as Error);
      }
    };

    poll();

    return () => {
      isPolling = false;
    };
  }
}

// Create and export the singleton instance
export const api = ApiClient.getInstance(apiConfig);
