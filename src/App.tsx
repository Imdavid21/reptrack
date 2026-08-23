import { useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { OfflineBanner } from "./components/pwa/OfflineBanner";
import { PWAUpdatePrompt } from "./components/pwa/PWAUpdatePrompt";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { Toaster } from "sonner";
import { lightTheme, darkTheme } from "./theme/muiTheme";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Changelog from "./pages/Changelog";
import AppIndex from "./pages/AppIndex";
import AdaptiveWorkout from "./pages/AdaptiveWorkout";
import Progress from "./pages/Progress";
import Insights from "./pages/Insights";
import Dataroom from "./pages/Dataroom";
import History from "./pages/History";
import Settings from "./pages/Settings";
import SettingsHub from "./pages/SettingsHub";
import LifecycleTracker from "./pages/LifecycleTracker";
import WorkoutDetail from "./pages/WorkoutDetail";
import OAuthConsent from "./pages/OAuthConsent";
import McpStatus from "./pages/McpStatus";

function ProgressWorkoutRedirect() {
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
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

function AppRoutes() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const routes = (
    <Routes location={location} key={location.pathname}>
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
      <Route path="/app/progress/dataroom" element={<Dataroom />} />
      <Route path="/app/progress/weight" element={<Navigate to="/app/progress/analytics?tab=vitals" replace />} />
      <Route path="/app/progress/nutrition" element={<Navigate to="/app/progress/analytics?tab=nutrition" replace />} />
      <Route path="/app/progress/training" element={<Navigate to="/app/progress/analytics?tab=training" replace />} />
      <Route path="/app/progress/recovery" element={<Navigate to="/app/progress/analytics?tab=vitals" replace />} />

      <Route path="/app/settings" element={<SettingsHub />} />
      <Route path="/app/settings/advanced" element={<Settings />} />
      <Route path="/app/settings/data" element={<Navigate to="/app/settings/advanced" replace />} />
      <Route path="/app/settings/mcp" element={<McpStatus />} />
      <Route path="/app/settings/advanced/lifecycle" element={<LifecycleTracker />} />
      <Route path="/app/chat" element={<Navigate to="/app/settings/mcp" replace />} />

      <Route path="/app/log" element={<AdaptiveWorkout />} />
      <Route path="/app/history" element={<Navigate to="/app/progress/history" replace />} />
      <Route path="/app/history/:workoutId" element={<ProgressWorkoutRedirect />} />
      <Route path="/app/insights" element={<Navigate to="/app/progress/analytics" replace />} />
      <Route path="/app/dataroom" element={<Navigate to="/app/progress/dataroom" replace />} />
      <Route path="/app/lifecycle" element={<Navigate to="/app/settings/advanced/lifecycle" replace />} />

      <Route path="/log" element={<Navigate to="/app/train" replace />} />
      <Route path="/create" element={<Navigate to="/app/train" replace />} />
      <Route path="/insights" element={<Navigate to="/app/progress/analytics" replace />} />
      <Route path="/dataroom" element={<Navigate to="/app/progress/dataroom" replace />} />
      <Route path="/analytics" element={<Navigate to="/app/progress/analytics" replace />} />
      <Route path="/health" element={<Navigate to="/app/progress/analytics?tab=vitals" replace />} />
      <Route path="/history" element={<Navigate to="/app/progress/history" replace />} />
      <Route path="/history/:workoutId" element={<ProgressWorkoutRedirect />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  return reduceMotion ? routes : <AnimatePresence mode="wait">{routes}</AnimatePresence>;
}

const isStandalone = typeof window !== 'undefined' && (
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone
);

function MuiThemedApp() {
  const { isDark } = useTheme();
  return (
    <MuiThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <CssBaseline />
      <Toaster theme={isDark ? 'dark' : 'light'} position="top-center" richColors closeButton />
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
        <ThemeProvider><MuiThemedApp /></ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
