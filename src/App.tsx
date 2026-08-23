import { lazy, Suspense, useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { OfflineBanner } from "./components/pwa/OfflineBanner";
import { PWAUpdatePrompt } from "./components/pwa/PWAUpdatePrompt";
import { WorkoutCompletionWatcher } from "./components/workout/WorkoutCompletionWatcher";
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

const AdaptiveWorkout = lazy(() => import("./pages/AdaptiveWorkout"));
const Dataroom = lazy(() => import("./pages/Dataroom"));
const DataroomBody = lazy(() => import("./pages/DataroomBody"));
const DataroomTraining = lazy(() => import("./pages/DataroomTraining"));
const DataroomExercise = lazy(() => import("./pages/DataroomExercise"));
const DataroomNutrition = lazy(() => import("./pages/DataroomNutrition"));
const DataroomRecovery = lazy(() => import("./pages/DataroomRecovery"));
const DataroomActivity = lazy(() => import("./pages/DataroomActivity"));
const DataroomRecords = lazy(() => import("./pages/DataroomRecords"));
const DataroomExplore = lazy(() => import("./pages/DataroomExplore"));
const History = lazy(() => import("./pages/History"));
const SettingsHub = lazy(() => import("./pages/SettingsHub"));
const SettingsAccount = lazy(() => import("./pages/SettingsAccount"));
const SettingsData = lazy(() => import("./pages/SettingsData"));
const SettingsAdvanced = lazy(() => import("./pages/SettingsAdvanced"));
const LifecycleTracker = lazy(() => import("./pages/LifecycleTracker"));
const WorkoutDetail = lazy(() => import("./pages/WorkoutDetail"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const McpStatus = lazy(() => import("./pages/McpStatus"));
const PerformanceLab = lazy(() => import("./pages/PerformanceLab"));
const AdvancedSimulator = lazy(() => import("./pages/AdvancedSimulator"));
const GymProfiles = lazy(() => import("./pages/GymProfiles"));
const FoodAutopilot = lazy(() => import("./pages/FoodAutopilot"));
const AdvancedSessionStart = lazy(() => import("./pages/AdvancedSessionStart"));
const PlateCalculator = lazy(() => import("./pages/PlateCalculator"));
const FlightRecorder = lazy(() => import("./pages/FlightRecorder"));
const CoachExport = lazy(() => import("./pages/CoachExport"));
const ExternalWorkoutImport = lazy(() => import("./pages/ExternalWorkoutImport"));

function RouteFallback() {
  return <div className="min-h-[45dvh] flex items-center justify-center px-4" role="status" aria-live="polite"><span className="type-caption">Loading…</span></div>;
}

function DataroomWorkoutRedirect() {
  const { workoutId } = useParams();
  return <Navigate to={`/app/dataroom/workout/${workoutId}`} replace />;
}

function LegacyAnalyticsRedirect() {
  const [params] = useSearchParams();
  const tab = params.get('tab');
  const target = tab === 'nutrition'
    ? '/app/dataroom/nutrition'
    : tab === 'training'
      ? '/app/dataroom/training'
      : tab === 'vitals'
        ? '/app/dataroom/recovery'
        : '/app/dataroom/explore';
  return <Navigate to={target} replace />;
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
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function AppRoutes() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const routes = (
    <Suspense fallback={<RouteFallback />}>
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

        <Route path="/app/dataroom" element={<Dataroom />} />
        <Route path="/app/dataroom/timeline" element={<History />} />
        <Route path="/app/dataroom/workout/:workoutId" element={<WorkoutDetail />} />
        <Route path="/app/dataroom/exercise/:exercise" element={<DataroomExercise />} />
        <Route path="/app/dataroom/body" element={<DataroomBody />} />
        <Route path="/app/dataroom/training" element={<DataroomTraining />} />
        <Route path="/app/dataroom/nutrition" element={<DataroomNutrition />} />
        <Route path="/app/dataroom/recovery" element={<DataroomRecovery />} />
        <Route path="/app/dataroom/activity" element={<DataroomActivity />} />
        <Route path="/app/dataroom/records" element={<DataroomRecords />} />
        <Route path="/app/dataroom/explore" element={<DataroomExplore />} />

        <Route path="/app/lab" element={<PerformanceLab />} />
        <Route path="/app/lab/session" element={<AdvancedSessionStart />} />
        <Route path="/app/lab/food" element={<FoodAutopilot />} />
        <Route path="/app/lab/plates" element={<PlateCalculator />} />
        <Route path="/app/lab/simulator" element={<AdvancedSimulator />} />
        <Route path="/app/lab/gyms" element={<GymProfiles />} />
        <Route path="/app/lab/recorder" element={<FlightRecorder />} />

        <Route path="/app/settings" element={<SettingsHub />} />
        <Route path="/app/settings/account" element={<SettingsAccount />} />
        <Route path="/app/settings/data" element={<SettingsData />} />
        <Route path="/app/settings/data/coach-report" element={<CoachExport />} />
        <Route path="/app/settings/data/import-workouts" element={<ExternalWorkoutImport />} />
        <Route path="/app/settings/advanced" element={<SettingsAdvanced />} />
        <Route path="/app/settings/mcp" element={<McpStatus />} />
        <Route path="/app/settings/advanced/lifecycle" element={<LifecycleTracker />} />
        <Route path="/app/chat" element={<Navigate to="/app/settings/mcp" replace />} />

        <Route path="/app/progress" element={<Navigate to="/app/dataroom" replace />} />
        <Route path="/app/progress/history" element={<Navigate to="/app/dataroom/timeline" replace />} />
        <Route path="/app/progress/workout/:workoutId" element={<DataroomWorkoutRedirect />} />
        <Route path="/app/progress/analytics" element={<LegacyAnalyticsRedirect />} />
        <Route path="/app/progress/dataroom" element={<Navigate to="/app/dataroom" replace />} />
        <Route path="/app/progress/weight" element={<Navigate to="/app/dataroom/body" replace />} />
        <Route path="/app/progress/nutrition" element={<Navigate to="/app/dataroom/nutrition" replace />} />
        <Route path="/app/progress/training" element={<Navigate to="/app/dataroom/training" replace />} />
        <Route path="/app/progress/recovery" element={<Navigate to="/app/dataroom/recovery" replace />} />
        <Route path="/app/history" element={<Navigate to="/app/dataroom/timeline" replace />} />
        <Route path="/app/history/:workoutId" element={<DataroomWorkoutRedirect />} />
        <Route path="/app/insights" element={<Navigate to="/app/dataroom/explore" replace />} />
        <Route path="/app/lifecycle" element={<Navigate to="/app/settings/advanced/lifecycle" replace />} />

        <Route path="/app/log" element={<AdaptiveWorkout />} />
        <Route path="/log" element={<Navigate to="/app/train" replace />} />
        <Route path="/create" element={<Navigate to="/app/train" replace />} />
        <Route path="/insights" element={<Navigate to="/app/dataroom/explore" replace />} />
        <Route path="/analytics" element={<LegacyAnalyticsRedirect />} />
        <Route path="/dataroom" element={<Navigate to="/app/dataroom" replace />} />
        <Route path="/health" element={<Navigate to="/app/dataroom/recovery" replace />} />
        <Route path="/history" element={<Navigate to="/app/dataroom/timeline" replace />} />
        <Route path="/history/:workoutId" element={<DataroomWorkoutRedirect />} />
        <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
        <WorkoutCompletionWatcher />
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
