// import { ApiError, NetworkError, errorLogger } from "./errors.ts";
// import { withRetry, retryable } from "./retry";
// import { getCookie, setCookie } from "./cookies.js";

// // Types
// export interface ConversionTask {
//   task_id: string;
//   status: "pending" | "processing" | "completed" | "failed";
//   status_url: string;
//   error?: string;
//   download_url?: string;
//   filename?: string;
// }

// export interface TaskStatus {
//   status: "pending" | "processing" | "completed" | "failed";
//   file_id: string;
//   error?: string;
//   download_url?: string;
//   filename?: string;
// }

// export interface ConversionError {
//   detail: string;
//   code: string;
//   status: number;
// }

// export class ApiClient {
//   private baseUrl: string;
//   private csrfToken: string | null = null;
//   private sessionId: string | null = null;

//   constructor(baseUrl: string = "/api") {
//     this.baseUrl = baseUrl;
//     this.csrfToken = getCookie("csrftoken");
//     this.sessionId = getCookie("sessionid");
//   }

//   private async request<T>(
//     endpoint: string,
//     options: RequestInit = {}
//   ): Promise<T> {
//     const url = `${this.baseUrl}${endpoint}`;
//     const headers = new Headers(options.headers);

//     // Add CSRF token if available
//     if (this.csrfToken) {
//       headers.set("X-CSRFToken", this.csrfToken);
//     }

//     // Add session cookie if available
//     if (this.sessionId) {
//       headers.set("Cookie", `sessionid=${this.sessionId}`);
//     }

//     try {
//       const response = await fetch(url, {
//         ...options,
//         headers,
//         credentials: "include", // Include cookies in requests
//       });

//       // Update session cookie if provided
//       const sessionCookie = response.headers.get("set-cookie");
//       if (sessionCookie?.includes("sessionid=")) {
//         this.sessionId = sessionCookie.split("sessionid=")[1].split(";")[0];
//       }

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}));
//         throw new ApiError(
//           errorData.message || "API request failed",
//           response.status,
//           errorData
//         );
//       }

//       return response.json();
//     } catch (error) {
//       if (error instanceof ApiError) {
//         throw error;
//       }
//       if (error instanceof TypeError && error.message === "Failed to fetch") {
//         throw new NetworkError("Network request failed");
//       }
//       throw error;
//     }
//   }

//   // Wrap request method with retry capability
//   private retryableRequest = retryable(this.request.bind(this), {
//     maxAttempts: 3,
//     shouldRetry: (error) => {
//       return (
//         error instanceof NetworkError ||
//         (error instanceof ApiError && error.statusCode >= 500)
//       );
//     },
//   });

//   async initializeSession(): Promise<void> {
//     try {
//       const response = await this.retryableRequest<{ csrf_token: string }>(
//         "/init-session/",
//         { method: "POST" }
//       );
//       this.csrfToken = response.csrf_token;
//       setCookie("csrftoken", this.csrfToken, {
//         secure: true,
//         sameSite: "Strict",
//         path: "/",
//       });
//     } catch (error) {
//       errorLogger.logError(error as Error, {
//         context: "Session initialization",
//         code: "SESSION_INIT_FAILED",
//       });
//       throw error;
//     }
//   }

//   async getSupportedFormats(): Promise<Record<string, string[]>> {
//     try {
//       return await this.retryableRequest<Record<string, string[]>>(
//         "/supported-formats/"
//       );
//     } catch (error) {
//       errorLogger.logError(error as Error, {
//         context: "Fetching supported formats",
//         code: "FORMATS_FETCH_FAILED",
//       });
//       throw error;
//     }
//   }

//   async convertFile(
//     file: File,
//     targetFormat: string,
//     onProgress?: (progress: number) => void
//   ): Promise<ConversionTask> {
//     return new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       const formData = new FormData();
//       formData.append("file", file);
//       formData.append("target_format", targetFormat);

//       if (this.csrfToken) {
//         formData.append("csrfmiddlewaretoken", this.csrfToken);
//       }

//       xhr.upload.addEventListener("progress", (event) => {
//         if (event.lengthComputable) {
//           const progress = (event.loaded / event.total) * 100;
//           onProgress?.(progress);
//         }
//       });

//       xhr.addEventListener("load", () => {
//         if (xhr.status >= 200 && xhr.status < 300) {
//           try {
//             const response = JSON.parse(xhr.responseText) as ConversionTask;
//             resolve(response);
//           } catch (error) {
//             reject(
//               new ApiError(
//                 "Invalid response format",
//                 xhr.status,
//                 "INVALID_RESPONSE",
//                 { responseText: xhr.responseText }
//               )
//             );
//           }
//         } else {
//           let errorData;
//           try {
//             errorData = JSON.parse(xhr.responseText);
//           } catch {
//             errorData = { message: xhr.statusText };
//           }
//           reject(
//             new ApiError(
//               errorData.message || "Upload failed",
//               xhr.status,
//               "UPLOAD_FAILED",
//               errorData
//             )
//           );
//         }
//       });

//       xhr.addEventListener("error", () => {
//         reject(new NetworkError("Network error during upload"));
//       });

//       xhr.addEventListener("abort", () => {
//         reject(
//           new ApiError("Upload aborted", 0, "UPLOAD_ABORTED", {
//             reason: "User aborted upload",
//           })
//         );
//       });

//       xhr.open("POST", `${this.baseUrl}/convert/`);
//       xhr.send(formData);
//     });
//   }

//   async getTaskStatus(taskId: string): Promise<ConversionTask> {
//     try {
//       return await this.retryableRequest<ConversionTask>(
//         `/task-status/${taskId}/`
//       );
//     } catch (error) {
//       errorLogger.logError(error as Error, {
//         context: "Checking task status",
//         taskId,
//         code: "TASK_STATUS_FAILED",
//       });
//       throw error;
//     }
//   }

//   async downloadFile(taskId: string): Promise<Blob> {
//     try {
//       const response = await fetch(`${this.baseUrl}/download/${taskId}/`, {
//         credentials: "include",
//         headers: this.csrfToken ? { "X-CSRFToken": this.csrfToken } : undefined,
//       });

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}));
//         throw new ApiError(
//           errorData.message || "Download failed",
//           response.status,
//           "DOWNLOAD_FAILED",
//           errorData
//         );
//       }

//       return response.blob();
//     } catch (error) {
//       errorLogger.logError(error as Error, {
//         context: "File download",
//         taskId,
//         code: "DOWNLOAD_FAILED",
//       });
//       throw error;
//     }
//   }
// }

// // Create a singleton instance
// export const apiClient = new ApiClient();

// /**
//  * Helper function to poll task status
//  * @param taskId Task ID to poll
//  * @param onStatusUpdate Callback for status updates
//  * @param onError Callback for errors
//  * @param interval Polling interval in milliseconds
//  * @returns Function to stop polling
//  */
// export function pollTaskStatus(
//   taskId: string,
//   onStatusUpdate: (status: ConversionTask) => void,
//   onError: (error: Error) => void,
//   interval: number = 2000
// ): () => void {
//   let isPolling = true;

//   const poll = async () => {
//     if (!isPolling) return;

//     try {
//       const status = await apiClient.getTaskStatus(taskId);
//       onStatusUpdate(status);

//       if (status.status === "completed" || status.status === "failed") {
//         isPolling = false;
//         return;
//       }

//       setTimeout(poll, interval);
//     } catch (error) {
//       isPolling = false;
//       onError(error as Error);
//     }
//   };

//   poll();

//   return () => {
//     isPolling = false;
//   };
// }
// Deprecated
