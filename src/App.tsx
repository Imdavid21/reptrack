import { useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { OfflineBanner } from "./components/pwa/OfflineBanner";
import { PWAUpdatePrompt } from "./components/pwa/PWAUpdatePrompt";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { AnimatePresence } from "framer-motion";
import { lightTheme, darkTheme } from "./theme/muiTheme";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

// Core pages — eagerly loaded for instant navigation in the PWA
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Changelog from "./pages/Changelog";
import AppIndex from "./pages/AppIndex";
import LogWorkout from "./pages/LogWorkout";
import Insights from "./pages/Insights";
import History from "./pages/History";
import Settings from "./pages/Settings";
import WorkoutDetail from "./pages/WorkoutDetail";

// Legacy redirect component that properly passes the workoutId param
function HistoryRedirect() {
  const { workoutId } = useParams();
  return <Navigate to={`/app/history/${workoutId}`} replace />;
}

// Keep marketing landing web-only; installed PWA opens app shell
function RootRoute() {
  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  }, []);

  if (isStandalone) {
    return <Navigate to="/app" replace />;
  }

  return <Landing />;
}

const queryClient = new QueryClient();

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/signin" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/changelog" element={<Changelog />} />

        {/* App routes (authenticated, eagerly loaded for instant navigation) */}
        <Route path="/app" element={<AppIndex />} />
        <Route path="/app/log" element={<LogWorkout />} />
        <Route path="/app/insights" element={<Insights />} />
        <Route path="/app/history" element={<History />} />
        <Route path="/app/history/:workoutId" element={<WorkoutDetail />} />
        <Route path="/app/settings" element={<Settings />} />

        {/* Legacy redirects */}
        <Route path="/log" element={<Navigate to="/app/log" replace />} />
        <Route path="/create" element={<Navigate to="/app/log" replace />} />
        <Route path="/insights" element={<Navigate to="/app/insights" replace />} />
        <Route path="/analytics" element={<Navigate to="/app/insights" replace />} />
        <Route path="/health" element={<Navigate to="/app/insights?tab=vitals" replace />} />
        <Route path="/history" element={<Navigate to="/app/history" replace />} />
        <Route path="/history/:workoutId" element={<HistoryRedirect />} />
        <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

function MuiThemedApp() {
  const { isDark } = useTheme();
  
  return (
    <MuiThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <CssBaseline />
      <BrowserRouter>
        <OfflineBanner />
        <PWAUpdatePrompt />
        <AppRoutes />
      </BrowserRouter>
    </MuiThemeProvider>
  );
}

const App = () => {
  // Global safety net for unhandled async errors (e.g. camera upload failures on mobile)
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MuiThemedApp />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
