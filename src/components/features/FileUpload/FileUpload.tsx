import { useState, useCallback, useMemo, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useConversionFlow } from "@/lib/hooks/useFileConversion";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import {
  FileIcon,
  UploadIcon,
  CheckIcon,
  XIcon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import type { ConversionFormat } from "@/lib/api/types";

// Constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "image/*": [".png", ".jpg", ".jpeg", ".gif"],
};

// Types
interface FormatOption {
  id: string;
  name: string;
}

interface FileUploadContentProps {
  onError?: (error: Error) => void;
}

// Debug logging
const debug = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[FileUpload] ${message}`, data || "");
    }
  },
  error: (message: string, error?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.error(`[FileUpload] ${message}`, error || "");
    }
  },
};

/**
 * FileUploadContent component handles the file upload and conversion process
 * It uses the useConversionFlow hook for managing the conversion state and API calls
 */
function FileUploadContent({ onError }: FileUploadContentProps) {
  // Log component mount/unmount
  useEffect(() => {
    debug.log("FileUploadContent mounted");
    return () => {
      debug.log("FileUploadContent unmounted");
    };
  }, []);

  // Get conversion flow state and handlers
  const {
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
    formats,
    isLoadingFormats,
  } = useConversionFlow();

  // Log when formats data changes
  useEffect(() => {
    debug.log("Formats data changed", {
      isLoading: isLoadingFormats,
      count: formats.length,
    });
  }, [formats, isLoadingFormats]);

  // Local state for format error
  const [formatError, setFormatError] = useState<string | null>(null);

  /**
   * Extract file extension from file name
   * Returns null if no extension found
   */
  const fileExtension = useMemo(() => {
    if (!file) return null;
    const ext = file.name.split(".").pop()?.toLowerCase();
    debug.log("File extension extracted", { file: file.name, extension: ext });
    return ext || null;
  }, [file?.name]);

  /**
   * Calculate available output formats based on input file type
   * Returns empty array if no formats available
   */
  const availableFormats = useMemo(() => {
    if (!fileExtension || !formats.length) {
      debug.log("No formats available", {
        fileExtension,
        formatsCount: formats.length,
      });
      return [];
    }

    // Find formats that support this file extension as input
    const supportedFormats = formats.filter((fmt: ConversionFormat) =>
      fmt.inputFormats.some((input) => input.toLowerCase() === fileExtension)
    );

    if (supportedFormats.length === 0) {
      debug.log("No supported formats found", { fileExtension });
      setFormatError(`File type .${fileExtension} is not supported`);
      return [];
    }

    // Get all possible output formats for this file type
    const outputFormats = supportedFormats.flatMap((fmt: ConversionFormat) =>
      fmt.outputFormats.map((output) => ({
        id: output,
        name: output.toUpperCase(),
      }))
    );

    // Remove duplicates and sort alphabetically
    const uniqueFormats = Array.from(
      new Map(outputFormats.map((f) => [f.id, f])).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    debug.log("Available formats calculated", {
      fileExtension,
      supportedCount: supportedFormats.length,
      outputCount: uniqueFormats.length,
    });

    return uniqueFormats;
  }, [fileExtension, formats]);

  /**
   * Handle file drop or selection
   * Validates file size and type
   */
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      debug.log("File dropped", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      if (file.size > MAX_FILE_SIZE) {
        const error = new Error("File too large (max 100MB)");
        setFormatError(error.message);
        onError?.(error);
        debug.error("File too large", {
          size: file.size,
          maxSize: MAX_FILE_SIZE,
        });
        return;
      }

      setFile(file);
      setFormat(""); // Reset format when new file is uploaded
      setFormatError(null);
    },
    [setFile, setFormat, onError]
  );

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    multiple: false,
  });

  /**
   * Handle format selection change
   */
  const handleFormatChange = useCallback(
    (value: string) => {
      debug.log("Format changed", { value });
      setFormat(value);
      setFormatError(null);
    },
    [setFormat]
  );

  /**
   * Start the conversion process
   */
  const handleStartConversion = useCallback(() => {
    if (!file || !format) return;
    debug.log("Starting conversion", { file: file.name, format });
    startConversion();
  }, [file, format, startConversion]);

  /**
   * Handle file download after successful conversion
   */
  const handleDownload = useCallback(() => {
    if (downloadUrl) {
      debug.log("Downloading file", { url: downloadUrl });
      window.open(downloadUrl, "_blank");
    }
  }, [downloadUrl]);

  // Log status changes
  useEffect(() => {
    debug.log("Conversion status changed", { status, progress });
  }, [status, progress]);

  // Log error changes
  useEffect(() => {
    if (error) {
      debug.error("Conversion error", error);
    }
  }, [error]);

  /**
   * Render the appropriate content based on conversion status
   */
  const renderContent = () => {
    switch (status) {
      case "idle":
        return (
          <div className="space-y-4">
            {/* File Drop Zone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-gray-300 hover:border-primary"
              }`}
            >
              <input {...getInputProps()} />
              <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                {isDragActive
                  ? "Drop the file here"
                  : "Drag and drop a file here, or click to select"}
              </p>
              <p className="text-xs text-gray-500 mt-1">Max file size: 100MB</p>
            </div>

            {/* File Info and Format Selection */}
            {file && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <FileIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm">{file.name}</span>
                </div>

                {isLoadingFormats ? (
                  <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                ) : formatError ? (
                  <p className="text-sm text-red-500">{formatError}</p>
                ) : availableFormats.length > 0 ? (
                  <Select value={format} onValueChange={handleFormatChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select output format" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFormats.map((fmt) => (
                        <SelectItem key={fmt.id} value={fmt.id}>
                          {fmt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-red-500">
                    No conversion formats available for this file type
                  </p>
                )}

                <Button
                  onClick={handleStartConversion}
                  disabled={!format || isLoadingFormats || !!formatError}
                  className="w-full"
                >
                  Convert
                </Button>
              </div>
            )}
          </div>
        );

      case "uploading":
      case "converting":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-center text-sm text-gray-600">
              {status === "uploading" ? "Uploading..." : "Converting..."}
            </p>
          </div>
        );

      case "completed":
        return (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center">
              <CheckIcon className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm text-gray-600">
              Conversion completed successfully!
            </p>
            <Button onClick={handleDownload} className="w-full">
              Download
            </Button>
            <Button onClick={reset} variant="outline" className="w-full">
              Convert Another File
            </Button>
          </div>
        );

      case "error":
        return (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center">
              <XIcon className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-sm text-red-600">
              {error instanceof Error
                ? error.message
                : "An error occurred during conversion"}
            </p>
            <Button onClick={reset} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return <div className="w-full max-w-md mx-auto p-4">{renderContent()}</div>;
}

/**
 * FileUpload component wrapper that provides the QueryProvider context
 */
export function FileUpload() {
  return (
    <QueryProvider>
      <FileUploadContent />
    </QueryProvider>
  );
}
