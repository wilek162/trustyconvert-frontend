import React from "react";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorLogger } from "@/lib/errors/error-logger";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    errorLogger.logError(error, { componentStack: errorInfo.componentStack });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Alert variant="destructive" className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            {this.state.error?.message || "Something went wrong"}
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
