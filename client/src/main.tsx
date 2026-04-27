import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { App } from "./app";
import { AnalyticsProvider } from "./app/providers/analytics-provider";
import { AuthProvider } from "./app/providers/auth-provider";
import { ReactQueryProvider } from "./app/providers/react-query";
import { SpaceProvider } from "./app/providers/space-provider";
import { ThemeProvider } from "./app/providers/theme-provider";
import { AppErrorBoundary } from "./shared/ui";

const rootElement = document.getElementById("root")!;

const root = ReactDOM.createRoot(rootElement);
root.render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AnalyticsProvider>
            <ReactQueryProvider>
              <SpaceProvider>
                <App />
              </SpaceProvider>
            </ReactQueryProvider>
          </AnalyticsProvider>
        </AuthProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
