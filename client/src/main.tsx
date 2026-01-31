import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { AuthProvider } from "./app/providers/auth-provider";
import { App } from "./app";

const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
}
