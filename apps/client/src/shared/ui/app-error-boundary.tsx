import { Component, type ErrorInfo, type ReactNode } from "react";
import * as m from "@/i18n/messages";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
          <p className="text-sm font-medium">{m.error_page_title()}</p>
          <button
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            onClick={() => window.location.reload()}
            type="button"
          >
            {m.error_page_reload()}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
