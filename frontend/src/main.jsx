import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./router.jsx";
import QueryProvider from "./providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryProvider>
      <App />
      <Toaster position="top-right" richColors closeButton />
    </QueryProvider>
  </StrictMode>
);