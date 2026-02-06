import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Clerk is optional - if no key is configured, the app will use legacy auth
const AppWithOptionalClerk = () => {
  if (!PUBLISHABLE_KEY) {
    console.warn("Clerk Publishable Key not configured - using legacy auth only");
    return <App />;
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  );
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppWithOptionalClerk />
  </React.StrictMode>
);
