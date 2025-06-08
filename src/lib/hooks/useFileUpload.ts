import { useState, useRef, useEffect } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { api } from "@/lib/api/client";
import type { ConversionTask } from "@/lib/api/types";
import { useCsrf } from "@/components/providers/CsrfProvider";

interface UseFileUploadOptions {
  onSuccess?: (taskId: string) => void;
  onError?: (error: Error) => void;
}

interface UseFileUploadReturn {
  file: File | null;
  setFile: (file: File | null) => void;
  targetFormat: string;
  loading: boolean;
  error: string;
  uploadProgress: number;
  conversionStatus: ConversionTask | null;
  supportedFormats: Record<string, string[]>;
  availableFormats: string[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setTargetFormat: (format: string) => void;
  cancelUpload: () => void;
}

export function useFileUpload({
  onSuccess,
  onError,
}: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [conversionStatus, setConversionStatus] =
    useState<ConversionTask | null>(null);
  const [supportedFormats, setSupportedFormats] = useState<
    Record<string, string[]>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopPollingRef = useRef<(() => void) | null>(null);
  const { csrfToken, setCsrfToken } = useCsrf();

  // Initialize session and load supported formats
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        // Always initialize session and get CSRF token on mount
        const token = await api.initializeSession();
        setCsrfToken(token);
        api.setCsrfToken(token);
        // Load formats
        const formats = await api.getSupportedFormats();
        if (mounted) {
          if (Array.isArray(formats)) {
            setSupportedFormats(
              formats.reduce(
                (acc, format) => {
                  format.inputFormats.forEach((inputFormat) => {
                    acc[inputFormat] = format.outputFormats;
                  });
                  return acc;
                },
                {} as Record<string, string[]>
              )
            );
          } else {
            setSupportedFormats({});
            setError("Failed to load supported formats. Please refresh the page.");
          }
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to initialize. Please refresh the page.");
          console.error("Initialization error:", err);
          onError?.(err as Error);
        }
      }
    };
    init();

    // Cleanup polling and abort controller on unmount
    return () => {
      mounted = false;
      if (stopPollingRef.current) {
        stopPollingRef.current();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset state when file changes
  useEffect(() => {
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const formats = supportedFormats[ext] || [];
      setTargetFormat(formats[0] || "");
      setError("");
      setConversionStatus(null);
      setUploadProgress(0);
    }
  }, [file, supportedFormats]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function cancelUpload() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (stopPollingRef.current) {
      stopPollingRef.current();
    }
    setLoading(false);
    setUploadProgress(0);
    setConversionStatus(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to convert.");
      return;
    }

    if (!targetFormat) {
      setError("Please select a target format.");
      return;
    }

    setLoading(true);
    setError("");
    setUploadProgress(0);
    setConversionStatus(null);

    // Create new abort controller for this upload
    abortControllerRef.current = new AbortController();

    try {
      // Start conversion
      const task = await api.convertFile(file, targetFormat, (progress) => {
        setUploadProgress(progress);
      });

      // Set conversion status to processing after task is received
      setConversionStatus({ ...task, status: "processing" });

      // Start polling for status
      stopPollingRef.current = api.pollTaskStatus(
        task.task_id,
        (status: ConversionTask) => {
          setConversionStatus(status);
          if (status.status === "completed") {
            // Use backend's download_url if available
            if (status.download_url) {
              // Construct the filename using the original file's stem and target format
              const originalName = file?.name || "converted";
              const ext = targetFormat;
              const displayFilename = `${originalName.replace(/\.[^/.]+$/, "")}.${ext}`;
              window.location.href = `${status.download_url}?filename=${encodeURIComponent(displayFilename)}`;
            }
            onSuccess?.(task.task_id);
          } else if (status.status === "failed") {
            setError(status.error || "Conversion failed");
            setLoading(false);
            onError?.(new Error(status.error || "Conversion failed"));
          }
        },
        (err: Error) => {
          setError(err.message);
          setLoading(false);
          onError?.(err);
        }
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Conversion failed");
      setError(error.message);
      setLoading(false);
      onError?.(error);
    }
  }

  // Get available target formats based on file extension
  const availableFormats = file
    ? supportedFormats[file.name.split(".").pop()?.toLowerCase() || ""] || []
    : [];

  return {
    file,
    setFile,
    targetFormat,
    loading,
    error,
    uploadProgress,
    conversionStatus,
    supportedFormats,
    availableFormats,
    fileInputRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleSubmit,
    setTargetFormat,
    cancelUpload,
  };
}

// Simple hook to fetch and return supported formats for display
export function useSupportedFormats() {
  const [formats, setFormats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getSupportedFormats()
      .then((formats) => {
        if (mounted) {
          setFormats(formats);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError("Failed to load supported formats");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { formats, loading, error };
}
