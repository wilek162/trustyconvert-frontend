/**
 * API Types for TrustyConvert
 */

export type TaskStatus = {
  task_id: string;
  file_id: string;
  status: "idle" | "uploading" | "processing" | "completed" | "failed";
  progress: number;
  filename?: string;
  error?: string;
  error_details?: Record<string, unknown>;
  download_url?: string;
  created_at: string;
  updated_at: string;
};

export type ConversionFormat = {
  id: string;
  name: string;
  inputFormats: string[];
  outputFormats: string[];
  maxSize: number;
  features?: string[];
};

export type ApiResponse<T> = {
  data: T;
  error?: string;
};

export type ConversionResponse = {
  task_id: string;
  file_id: string;
  status: TaskStatus["status"];
};

export interface APIErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface APIResponse<T> {
  data: T;
  meta?: {
    page?: number;
    total?: number;
    limit?: number;
  };
}

export type UploadProgressCallback = (progress: number) => void;
export type TaskStatusCallback = (status: TaskStatus) => void;
export type ErrorCallback = (error: Error) => void;
