import { useEffect } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import * as m from "@/i18n/messages";
import { posthog } from "@/shared/lib/analytics";

export function RootErrorFallback({ error, reset }: ErrorComponentProps) {
  useEffect(() => {
    posthog.captureException(error, {
      extra: {
        error_type: "render",
        route: window.location.pathname,
        release: import.meta.env.APP_VERSION,
      },
    });
  }, [error]);
  return (
    <div className="flex h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{m.error_page_title()}</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        {m.error_page_description()}
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
      >
        {m.error_page_reload()}
      </button>
    </div>
  );
}
