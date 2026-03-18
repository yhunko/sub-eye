import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { AuthProvider } from "./app/providers/auth-provider";
import { App } from "./app";
import { ThemeProvider } from "./app/providers/theme-provider";
import { ReactQueryProvider } from "./app/providers/react-query";
import { AnalyticsProvider } from "./app/providers/analytics-provider";

const rootElement = document.getElementById("root")!;

const root = ReactDOM.createRoot(rootElement);
root.render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AnalyticsProvider>
          <ReactQueryProvider>
            <App />
          </ReactQueryProvider>
        </AnalyticsProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
