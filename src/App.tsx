import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { AnimatePresence } from "framer-motion";
import { lightTheme, darkTheme } from "./theme/muiTheme";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Index from "./pages/Index";
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
        <Route path="/" element={<Index />} />
        <Route path="/log" element={<LogWorkout />} />
        <Route path="/create" element={<CreateRoutine />} />
        <Route path="/insights" element={<Insights />} />
        {/* Redirect old routes to new unified insights */}
        <Route path="/analytics" element={<Navigate to="/insights" replace />} />
        <Route path="/health" element={<Navigate to="/insights?tab=vitals" replace />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:workoutId" element={<WorkoutDetail />} />
        <Route path="/settings" element={<Settings />} />
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
