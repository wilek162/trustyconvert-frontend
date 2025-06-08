import React from "react";
import { CheckCircle, XCircle, Loader2, Download } from "lucide-react";

import type { TaskStatus } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConversionStatusProps {
  status: TaskStatus["status"];
  progress: number;
  filename?: string;
  downloadUrl?: string;
  onCancel: () => void;
  onRetry: () => void;
}

export function ConversionStatus({
  status,
  progress,
  filename,
  downloadUrl,
  onCancel,
  onRetry,
}: ConversionStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "failed":
        return <XCircle className="h-6 w-6 text-red-500" />;
      case "processing":
        return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "completed":
        return "Conversion completed successfully!";
      case "failed":
        return "Conversion failed. Please try again.";
      case "processing":
        return "Converting your file...";
      default:
        return "Preparing conversion...";
    }
  };

  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4">
          {getStatusIcon()}
          <div className="flex-1">
            <h3 className="text-lg font-medium">{getStatusMessage()}</h3>
            {filename && (
              <p className="text-sm text-gray-500">File: {filename}</p>
            )}
          </div>
        </div>

        {status === "processing" && (
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-500 mt-2">
              Progress: {progress}%
            </p>
          </div>
        )}

        {status === "failed" && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              An error occurred during conversion. Please try again.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-4 flex space-x-2">
          {status === "processing" && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {status === "failed" && (
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
          {status === "completed" && downloadUrl && (
            <Button onClick={() => window.open(downloadUrl, "_blank")}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 