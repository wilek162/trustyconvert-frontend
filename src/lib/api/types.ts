/**
 * API Response Types
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/**
 * Error Response Type
 */
export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: unknown;
  status: number;
}

/**
 * API Configuration
 */
export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  csrfTokenHeader?: string;
}

/**
 * File Conversion Types
 */
export interface ConversionTask {
  taskId: string;
  status: TaskStatus["status"];
  progress: number;
  error?: string;
  status_url?: string;
  download_url?: string;
  filename?: string;
  inputFile: {
    name: string;
    size: number;
    type: string;
  };
  outputFile?: {
    url: string;
    name: string;
    size: number;
    type: string;
  };
}

export interface ConversionFormat {
  id: string;
  name: string;
  description: string;
  inputFormats: string[];
  outputFormats: string[];
  maxSize: number; // in bytes
  features: string[];
}

export interface TaskStatus {
  status: "pending" | "processing" | "completed" | "failed";
  file_id: string;
  error?: string;
  download_url?: string;
  filename?: string;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

export interface TaskStatusCallback {
  (status: ConversionTask): void;
}

export interface ErrorCallback {
  (error: Error): void;
}
