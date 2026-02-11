import { useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { OfflineBanner } from "./components/pwa/OfflineBanner";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { AnimatePresence } from "framer-motion";
import { lightTheme, darkTheme } from "./theme/muiTheme";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
// Landing & Auth — eagerly loaded (entry points)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Legacy redirect component that properly passes the workoutId param
function HistoryRedirect() {
  const { workoutId } = useParams();
  return <Navigate to={`/app/history/${workoutId}`} replace />;
}

// Route-based code splitting — each page downloads only when navigated to
const AppIndex = lazy(() => import("./pages/AppIndex"));
const LogWorkout = lazy(() => import("./pages/LogWorkout"));
const Insights = lazy(() => import("./pages/Insights"));
const History = lazy(() => import("./pages/History"));
const Settings = lazy(() => import("./pages/Settings"));
const WorkoutDetail = lazy(() => import("./pages/WorkoutDetail"));

// Lazy-loaded public pages (not needed in PWA)
const Privacy = lazy(() => import("./pages/Privacy"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Changelog = lazy(() => import("./pages/Changelog"));

// Lightweight fallback shown while lazy chunks load
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-2xl font-bold tracking-widest animate-pulse">
        REPTRACK<span className="text-muted-foreground">&nbsp;</span>FITNESS
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        <Route path="/privacy" element={<Suspense fallback={null}><Privacy /></Suspense>} />
        <Route path="/blog" element={<Suspense fallback={null}><Blog /></Suspense>} />
        <Route path="/blog/:slug" element={<Suspense fallback={null}><BlogPost /></Suspense>} />
        <Route path="/changelog" element={<Suspense fallback={null}><Changelog /></Suspense>} />

        {/* App routes (authenticated, lazy-loaded) */}
        <Route path="/app" element={<Suspense fallback={<RouteFallback />}><AppIndex /></Suspense>} />
        <Route path="/app/log" element={<Suspense fallback={<RouteFallback />}><LogWorkout /></Suspense>} />
        <Route path="/app/insights" element={<Suspense fallback={<RouteFallback />}><Insights /></Suspense>} />
        <Route path="/app/history" element={<Suspense fallback={<RouteFallback />}><History /></Suspense>} />
        <Route path="/app/history/:workoutId" element={<Suspense fallback={<RouteFallback />}><WorkoutDetail /></Suspense>} />
        <Route path="/app/settings" element={<Suspense fallback={<RouteFallback />}><Settings /></Suspense>} />

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
