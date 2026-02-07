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
import CreateRoutine from "./pages/CreateRoutine";
import Insights from "./pages/Insights";
import History from "./pages/History";
import Settings from "./pages/Settings";
import WorkoutDetail from "./pages/WorkoutDetail";
import NotFound from "./pages/NotFound";

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

        {/* App routes (authenticated) */}
        <Route path="/app" element={<AppIndex />} />
        <Route path="/app/log" element={<LogWorkout />} />
        <Route path="/app/create" element={<CreateRoutine />} />
        <Route path="/app/insights" element={<Insights />} />
        <Route path="/app/history" element={<History />} />
        <Route path="/app/history/:workoutId" element={<WorkoutDetail />} />
        <Route path="/app/settings" element={<Settings />} />

        {/* Legacy redirects */}
        <Route path="/log" element={<Navigate to="/app/log" replace />} />
        <Route path="/create" element={<Navigate to="/app/create" replace />} />
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <MuiThemedApp />
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
