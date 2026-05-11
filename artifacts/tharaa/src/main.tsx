import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "sonner";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster
      richColors
      dir="rtl"
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "font-sans !font-[family-name:var(--font-sans)]",
          title: "font-sans",
          description: "font-sans",
        },
      }}
    />
  </React.StrictMode>
);
