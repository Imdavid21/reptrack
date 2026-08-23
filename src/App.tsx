import { useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { OfflineBanner } from "./components/pwa/OfflineBanner";
import { PWAUpdatePrompt } from "./components/pwa/PWAUpdatePrompt";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { Toaster } from "sonner";
import { lightTheme, darkTheme } from "./theme/muiTheme";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Changelog from "./pages/Changelog";
import OAuthConsent from "./pages/OAuthConsent";

import AppIndex from "./pages/AppIndex";
import AdaptiveWorkout from "./pages/AdaptiveWorkout";
import Progress from "./pages/Progress";
import History from "./pages/History";
import WorkoutDetail from "./pages/WorkoutDetail";
import Insights from "./pages/Insights";
import Dataroom from "./pages/Dataroom";
import SettingsHome from "./pages/SettingsHome";
import Settings from "./pages/Settings";
import LifecycleTracker from "./pages/LifecycleTracker";
import McpStatus from "./pages/McpStatus";

function LegacyWorkoutDetailRedirect() {
  const { workoutId } = useParams();
  return <Navigate to={`/app/progress/workout/${workoutId}`} replace />;
}

function RootRoute() {
  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  }, []);

  return isStandalone ? <Navigate to="/app" replace /> : <Landing />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/signin" element={<Auth />} />
      <Route path="/signup" element={<Auth />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/changelog" element={<Changelog />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />

      <Route path="/app" element={<AppIndex />} />
      <Route path="/app/train" element={<AdaptiveWorkout />} />
      <Route path="/app/train/current" element={<AdaptiveWorkout />} />
      <Route path="/app/progress" element={<Progress />} />
      <Route path="/app/progress/history" element={<History />} />
      <Route path="/app/progress/workout/:workoutId" element={<WorkoutDetail />} />

      <Route path="/app/progress/analytics" element={<Insights />} />
      <Route path="/app/progress/training" element={<Insights />} />
      <Route path="/app/progress/recovery" element={<Insights />} />
      <Route path="/app/progress/nutrition" element={<Insights />} />
      <Route path="/app/progress/dataroom" element={<Dataroom />} />

      <Route path="/app/settings" element={<SettingsHome />} />
      <Route path="/app/settings/data" element={<Settings />} />
      <Route path="/app/settings/advanced" element={<Settings />} />
      <Route path="/app/settings/mcp" element={<McpStatus />} />
      <Route path="/app/settings/lifecycle" element={<LifecycleTracker />} />

      <Route path="/app/log" element={<Navigate to="/app/train" replace />} />
      <Route path="/app/history" element={<Navigate to="/app/progress/history" replace />} />
      <Route path="/app/history/:workoutId" element={<LegacyWorkoutDetailRedirect />} />
      <Route path="/app/insights" element={<Navigate to="/app/progress" replace />} />
      <Route path="/app/dataroom" element={<Navigate to="/app/progress/dataroom" replace />} />
      <Route path="/app/lifecycle" element={<Navigate to="/app/settings/lifecycle" replace />} />
      <Route path="/app/chat" element={<Navigate to="/app/settings/mcp" replace />} />

      <Route path="/log" element={<Navigate to="/app/train" replace />} />
      <Route path="/create" element={<Navigate to="/app/train" replace />} />
      <Route path="/insights" element={<Navigate to="/app/progress" replace />} />
      <Route path="/dataroom" element={<Navigate to="/app/progress/dataroom" replace />} />
      <Route path="/analytics" element={<Navigate to="/app/progress" replace />} />
      <Route path="/health" element={<Navigate to="/app/progress/recovery" replace />} />
      <Route path="/history" element={<Navigate to="/app/progress/history" replace />} />
      <Route path="/history/:workoutId" element={<LegacyWorkoutDetailRedirect />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const isStandalone = typeof window !== "undefined" && (
  window.matchMedia("(display-mode: standalone)").matches ||
  Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
);

function MuiThemedApp() {
  const { isDark } = useTheme();

  return (
    <MuiThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <CssBaseline />
      <Toaster theme={isDark ? "dark" : "light"} position="top-center" closeButton />
      <BrowserRouter>
        <OfflineBanner />
        {isStandalone && <PWAUpdatePrompt />}
        <AppRoutes />
      </BrowserRouter>
    </MuiThemeProvider>
  );
}

const App = () => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MuiThemedApp />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
