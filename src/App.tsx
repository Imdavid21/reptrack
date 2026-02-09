import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { AnimatePresence } from "framer-motion";
import { lightTheme, darkTheme } from "./theme/muiTheme";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
// Landing & Auth pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
// App pages
import AppIndex from "./pages/AppIndex";
import LogWorkout from "./pages/LogWorkout";
import Insights from "./pages/Insights";
import History from "./pages/History";
import Settings from "./pages/Settings";
import WorkoutDetail from "./pages/WorkoutDetail";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";

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
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/blog" element={<Blog />} />

        {/* App routes (authenticated) */}
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
        <Route path="/history/:workoutId" element={<Navigate to="/app/history/:workoutId" replace />} />
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
