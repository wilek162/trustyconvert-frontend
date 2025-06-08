import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, APIRequestError } from "@/lib/api/client";
import type { TaskStatus } from "@/lib/api/types";
import { withRetry } from "@/lib/retry";
import { useState, useCallback } from "react";

const POLLING_INTERVAL = 2000; // 2 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export function useFileConversion() {
  const queryClient = useQueryClient();

  // Mutation for starting a conversion
  const conversion = useMutation({
    mutationFn: async ({
      file,
      targetFormat,
    }: {
      file: File;
      targetFormat: string;
    }) => {
      return withRetry(() => apiClient.startConversion(file, targetFormat), {
        maxAttempts: MAX_RETRIES,
        initialDelay: RETRY_DELAY,
        shouldRetry: (error) => {
          // Only retry on network errors or 5xx server errors
          if (error instanceof APIRequestError) {
            return error.code.startsWith("5");
          }
          return error.name === "NetworkError";
        },
      });
    },
    onSuccess: (data) => {
      // Start polling for status updates
      queryClient.setQueryData(["conversionStatus", data.task_id], data);
    },
    onError: (error) => {
      // Log error for monitoring
      console.error("Conversion start failed:", error);
    },
  });

  // Query for checking conversion status
  const useConversionStatus = (taskId: string | null) => {
    return useQuery({
      queryKey: ["conversionStatus", taskId],
      queryFn: () => {
        if (!taskId) throw new Error("No task ID provided");
        return withRetry(() => apiClient.getTaskStatus(taskId), {
          maxAttempts: MAX_RETRIES,
          initialDelay: RETRY_DELAY,
          shouldRetry: (error) => {
            // Only retry on network errors or 5xx server errors
            if (error instanceof APIRequestError) {
              return error.code.startsWith("5");
            }
            return error.name === "NetworkError";
          },
        });
      },
      enabled: !!taskId,
      refetchInterval: (query) => {
        const data = query.state.data;
        // Stop polling when conversion is complete or failed
        if (!data || data.status === "completed" || data.status === "failed") {
          return false;
        }
        return POLLING_INTERVAL;
      },
      // Add retry configuration
      retry: (failureCount, error) => {
        // Don't retry on client errors
        if (error instanceof APIRequestError && error.code.startsWith("4")) {
          return false;
        }
        return failureCount < MAX_RETRIES;
      },
      retryDelay: (attemptIndex) =>
        Math.min(
          RETRY_DELAY * Math.pow(2, attemptIndex),
          10000 // Max 10 seconds
        ),
    });
  };

  // Query for supported formats
  const formats = useQuery({
    queryKey: ["conversionFormats"],
    queryFn: () =>
      withRetry(() => apiClient.getSupportedFormats(), {
        maxAttempts: MAX_RETRIES,
        initialDelay: RETRY_DELAY,
        shouldRetry: (error) => {
          // Only retry on network errors or 5xx server errors
          if (error instanceof APIRequestError) {
            return error.code.startsWith("5");
          }
          return error.name === "NetworkError";
        },
      }),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    // Add retry configuration
    retry: (failureCount, error) => {
      // Don't retry on client errors
      if (error instanceof APIRequestError && error.code.startsWith("4")) {
        return false;
      }
      return failureCount < MAX_RETRIES;
    },
    retryDelay: (attemptIndex) =>
      Math.min(
        RETRY_DELAY * Math.pow(2, attemptIndex),
        10000 // Max 10 seconds
      ),
  });

  return {
    conversion,
    useConversionStatus,
    formats,
  };
}

type ConversionStatus =
  | "idle"
  | "uploading"
  | "converting"
  | "completed"
  | "error";

// Helper hook for managing the entire conversion flow
export function useConversionFlow() {
  const { conversion, useConversionStatus, formats } = useFileConversion();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<string>("");
  const queryClient = useQueryClient();

  const taskId = conversion.data?.task_id ?? null;
  const statusQuery = useConversionStatus(taskId);
  const status = statusQuery.data?.status || "idle";
  const progress = statusQuery.data?.progress || 0;
  const downloadUrl = statusQuery.data?.download_url;

  const startConversion = useCallback(() => {
    if (!file || !format) return;
    conversion.mutate({ file, targetFormat: format });
  }, [file, format, conversion]);

  const reset = useCallback(() => {
    setFile(null);
    setFormat("");
    queryClient.removeQueries({ queryKey: ["conversionStatus"] });
  }, [queryClient]);

  return {
    // File state
    file,
    setFile,
    format,
    setFormat,
    // Start conversion
    startConversion,
    // Current task status
    status: status as ConversionStatus,
    progress,
    downloadUrl,
    // Error state
    error: conversion.error || statusQuery.error,
    // Reset function
    reset,
    // Format data
    formats: formats.data || [],
    isLoadingFormats: formats.isLoading,
  };
}
