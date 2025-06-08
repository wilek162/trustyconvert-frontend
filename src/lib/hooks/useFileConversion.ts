import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, APIRequestError } from "@/lib/api/client";
import type { ConversionFormat, TaskStatus } from "@/lib/api/types";
import { withRetry } from "@/lib/retry";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useToast } from "@/lib/hooks/useToast";

const POLLING_INTERVAL = 2000; // 2 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Cache key for formats
const FORMATS_QUERY_KEY = ["supportedFormats"] as const;

// Debug logging
const debug = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[useFileConversion] ${message}`, data || "");
    }
  },
  error: (message: string, error?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.error(`[useFileConversion] ${message}`, error || "");
    }
  },
};

/**
 * Hook for managing file conversion flow
 * Handles file upload, format selection, conversion status, and download
 */
export function useFileConversion() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<string>("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskStatus["status"]>("idle");
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Log hook initialization
  useEffect(() => {
    debug.log("Hook initialized");
    return () => {
      debug.log("Hook cleanup");
      // Clear any pending timeouts
      if (taskId) {
        debug.log("Cleaning up task", { taskId });
        setTaskId(null);
        setStatus("idle");
      }
    };
  }, []);

  /**
   * Query for supported conversion formats
   * Uses aggressive caching to prevent unnecessary API calls
   */
  const { data: formats = [], isLoading: isLoadingFormats } = useQuery({
    queryKey: FORMATS_QUERY_KEY,
    queryFn: async () => {
      debug.log("Fetching supported formats");
      const response = await apiClient.getSupportedFormats();
      debug.log("Formats fetched", { count: response.length });
      return response;
    },
    staleTime: Infinity, // Never consider the data stale
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (4xx)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // Retry up to 2 times with exponential backoff
      return failureCount < 2;
    },
  });

  // Memoize formats data to prevent unnecessary re-renders
  const memoizedFormats = useMemo(() => {
    debug.log("Memoizing formats data", {
      hasData: !!formats,
      dataLength: formats?.length,
    });
    return formats;
  }, [formats]);

  /**
   * Mutation for starting a file conversion
   * Handles file upload and conversion initiation
   */
  const startConversionMutation = useMutation({
    mutationFn: async () => {
      if (!file || !format) {
        throw new Error("File and format are required");
      }
      debug.log("Starting conversion", { file: file.name, format });
      const response = await apiClient.startConversion(file, format);
      return response;
    },
    onSuccess: (data) => {
      debug.log("Conversion started successfully", { taskId: data.task_id });
      setTaskId(data.task_id);
      setStatus("processing");
      setError(null);
    },
    onError: (error: Error) => {
      debug.error("Conversion start failed", error);
      setError(error);
      setStatus("failed");
      addToast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  /**
   * Query for checking conversion status
   * Polls the API until conversion is complete or failed
   */
  const { data: taskStatus } = useQuery({
    queryKey: ["taskStatus", taskId],
    queryFn: async () => {
      if (!taskId) return null;
      debug.log("Checking task status", { taskId });
      const response = await apiClient.getTaskStatus(taskId);
      return response;
    },
    enabled: !!taskId && status === "processing",
    refetchInterval: (data) => {
      // Stop polling if task is complete or failed
      if (data?.status === "completed" || data?.status === "failed") {
        debug.log("Stopping status polling", { status: data?.status });
        return false;
      }
      return POLLING_INTERVAL;
    },
    onSuccess: (data) => {
      if (!data) return;

      debug.log("Task status updated", {
        status: data.status,
        progress: data.progress,
      });

      setProgress(data.progress);

      if (data.status === "completed") {
        setStatus("completed");
        setDownloadUrl(data.download_url);
        addToast({
          title: "Success",
          description: "File converted successfully!",
        });
      } else if (data.status === "failed") {
        setStatus("failed");
        setError(new Error(data.error || "Conversion failed"));
        addToast({
          title: "Error",
          description: data.error || "Conversion failed",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      debug.error("Task status check failed", error);
      setStatus("failed");
      setError(error);
      addToast({
        title: "Error",
        description: "Failed to check conversion status",
        variant: "destructive",
      });
    },
  });

  /**
   * Start the conversion process
   */
  const startConversion = useCallback(() => {
    if (!file || !format) {
      const error = new Error("File and format are required");
      setError(error);
      addToast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setStatus("uploading");
    startConversionMutation.mutate();
  }, [file, format, startConversionMutation, addToast]);

  /**
   * Reset the conversion state
   */
  const reset = useCallback(() => {
    debug.log("Resetting conversion state");
    setFile(null);
    setFormat("");
    setTaskId(null);
    setStatus("idle");
    setProgress(0);
    setDownloadUrl(null);
    setError(null);
  }, []);

  return {
    file,
    setFile,
    format,
    setFormat,
    startConversion,
    status,
    progress,
    downloadUrl,
    error,
    reset,
    formats: memoizedFormats,
    isLoadingFormats,
  };
}

type ConversionStatus =
  | "idle"
  | "uploading"
  | "converting"
  | "completed"
  | "error";

/**
 * Hook for managing the entire conversion flow
 * Handles file selection, format selection, and conversion status
 */
export function useConversionFlow() {
  const { conversion, useConversionStatus, formats } = useFileConversion();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<string>("");
  const queryClient = useQueryClient();

  // Log when the flow hook is initialized
  useEffect(() => {
    debug.log("useConversionFlow hook initialized");
    return () => {
      debug.log("useConversionFlow hook cleanup");
    };
  }, []);

  const taskId = conversion.data?.task_id ?? null;
  const statusQuery = useConversionStatus(taskId);
  const status = statusQuery.data?.status || "idle";
  const progress = statusQuery.data?.progress || 0;
  const downloadUrl = statusQuery.data?.download_url;

  // Memoize the formats data to prevent unnecessary re-renders
  const formatsData = useMemo(() => {
    debug.log("Memoizing formats data", {
      hasData: !!formats.data,
      dataLength: formats.data?.length,
    });
    return formats.data || [];
  }, [formats.data]);

  const startConversion = useCallback(() => {
    if (!file || !format) return;
    debug.log("Starting conversion flow", { file: file.name, format });
    conversion.mutate({ file, targetFormat: format });
  }, [file, format, conversion]);

  const reset = useCallback(() => {
    debug.log("Resetting conversion flow");
    setFile(null);
    setFormat("");
    queryClient.removeQueries({ queryKey: ["conversionStatus"] });
  }, [queryClient]);

  // Log when file or format changes
  useEffect(() => {
    debug.log("File or format changed", {
      hasFile: !!file,
      fileType: file?.type,
      format,
    });
  }, [file, format]);

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
    formats: formatsData,
    isLoadingFormats: formats.isLoading,
  };
}
