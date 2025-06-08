import { useState, useCallback } from "react";
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

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function FileUploadContent() {
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

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          console.error("File too large");
          return;
        }
        setFile(file);
      }
    },
    [setFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxFiles: 1,
  });

  const handleFormatChange = (value: string) => {
    setFormat(value);
  };

  const handleStartConversion = () => {
    if (file && format) {
      startConversion();
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  const renderContent = () => {
    switch (status) {
      case "idle":
        return (
          <div className="space-y-4">
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

            {file && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <FileIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm">{file.name}</span>
                </div>

                <Select value={format} onValueChange={handleFormatChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select output format" />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map((fmt) => (
                      <SelectItem key={fmt.id} value={fmt.id}>
                        {fmt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleStartConversion}
                  disabled={!format || isLoadingFormats}
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

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-card rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-center mb-6">File Converter</h2>
      {renderContent()}
    </div>
  );
}

export function FileUpload() {
  return (
    <QueryProvider>
      <FileUploadContent />
    </QueryProvider>
  );
}
