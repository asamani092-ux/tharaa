import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import { Toaster } from "sonner";
import { applyTheme, getStoredTheme } from "@/lib/theme";

applyTheme(getStoredTheme());

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Toaster
      richColors
      dir="rtl"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "font-sans border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]",
          title: "font-semibold",
          description: "text-[var(--text-secondary)]",
        },
      }}
    />
  </React.StrictMode>
);
