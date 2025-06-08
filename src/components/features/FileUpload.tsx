import React from "react";
import { useFileUpload } from "@/lib/hooks/useFileUpload";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertCircle, Upload, X, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { formatFileSize } from "@/lib/utils/format";

export default function FileUpload() {
  const {
    file,
    setFile,
    targetFormat,
    loading,
    error,
    uploadProgress,
    conversionStatus,
    availableFormats,
    fileInputRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleSubmit,
    setTargetFormat,
    cancelUpload,
  } = useFileUpload({
    onSuccess: (taskId) => {
      // Use the conversionStatus to get the filename if available
      const filename =
        conversionStatus?.filename || file?.name || "converted_file";
      window.location.href = `/download?id=${encodeURIComponent(taskId)}&filename=${encodeURIComponent(filename)}`;
    },
    onError: (error) => {
      // Optionally show a toast or log
      console.error("File upload error:", error);
    },
  });

  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeaveWrapper = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleDragLeave(e);
  };

  const handleDropWrapper = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(false);
    handleDrop(e);
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎥";
    if (type.startsWith("audio/")) return "🎵";
    if (type.startsWith("text/")) return "📄";
    if (type.includes("pdf")) return "📑";
    if (type.includes("word") || type.includes("document")) return "📝";
    if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
    if (type.includes("powerpoint") || type.includes("presentation"))
      return "📽️";
    return "📁";
  };

  return (
    <Card className="w-full max-w-lg shadow-2xl border border-primary/10 bg-gradient-to-br from-white via-gray-50 to-primary/10 p-8 animate-in fade-in-0 zoom-in-95 transition-transform duration-300 hover:scale-[1.025] hover:shadow-3xl">
      <CardHeader className="flex flex-col items-center">
        <Avatar className="mb-2 shadow-lg ring-2 ring-primary/30">
          <AvatarImage src="/favicon.svg" alt="Logo" />
        </Avatar>
        <Badge variant="secondary" className="mb-2 flex items-center gap-1">
          <ShieldCheck className="h-4 w-4" />
          Secure & Free
        </Badge>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          autoComplete="off"
        >
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-primary bg-primary/10 scale-[1.02]"
                : file
                  ? "border-primary/30 bg-primary/5"
                  : "border-primary/30 hover:bg-primary/5"
            }`}
            onDrop={handleDropWrapper}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeaveWrapper}
            onClick={() => fileInputRef.current?.click()}
            tabIndex={0}
            aria-label="File upload area"
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept="*"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="text-4xl mb-2">{getFileIcon(file)}</div>
                <span className="font-medium break-all">{file.name}</span>
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove file
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 animate-bounce" />
                <span className="text-gray-500">
                  {isDragging
                    ? "Drop your file here"
                    : "Click or drag a file here to upload"}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {/* Supported formats list */}
                  Supported formats: (see FAQ)
                </span>
              </div>
            )}
          </div>

          {file && availableFormats.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="targetFormat" className="font-medium">
                Convert to:
              </label>
              <select
                id="targetFormat"
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
                className="border rounded px-2 py-1 bg-background"
                disabled={loading}
              >
                {availableFormats.map((format) => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
              <Tooltip content="Select the format you want to convert your file to">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </Tooltip>
            </div>
          )}

          {file && availableFormats.length === 0 && (
            <Alert variant="destructive" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This file type is not supported for conversion.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {conversionStatus?.status === "processing"
                    ? "Converting your file..."
                    : `Uploading... ${Math.round(uploadProgress)}%`}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelUpload}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              loading || !file || availableFormats.length === 0 || !targetFormat
            }
          >
            {loading ? "Processing..." : "Convert File"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
