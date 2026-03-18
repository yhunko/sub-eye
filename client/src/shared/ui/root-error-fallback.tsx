import type { ErrorComponentProps } from "@tanstack/react-router";
import * as m from "@/i18n/messages";

export function RootErrorFallback({ reset }: ErrorComponentProps) {
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
