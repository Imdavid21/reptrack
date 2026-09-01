import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { OfflineBanner } from "./components/pwa/OfflineBanner";
import { PWAUpdatePrompt } from "./components/pwa/PWAUpdatePrompt";
import { WorkoutCompletionWatcher } from "./components/workout/WorkoutCompletionWatcher";
import { AppSeparatorNormalizer } from "./components/common/AppSeparatorNormalizer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { Toaster } from "sonner";
import { lightTheme, darkTheme } from "./theme/muiTheme";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { useAuth } from "./hooks/useAuth";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Changelog from "./pages/Changelog";
import AppIndex from "./pages/AppIndex";

const loadAdaptiveWorkout = () => import("./pages/AdaptiveWorkout");
const loadDataroom = () => import("./pages/Dataroom");
const loadDataroomBody = () => import("./pages/DataroomBody");
const loadDataroomTraining = () => import("./pages/DataroomTraining");
const loadDataroomExercise = () => import("./pages/DataroomExercise");
const loadDataroomNutrition = () => import("./pages/DataroomNutrition");
const loadDataroomRecovery = () => import("./pages/DataroomRecovery");
const loadDataroomActivity = () => import("./pages/DataroomActivity");
const loadDataroomRecords = () => import("./pages/DataroomRecords");
const loadDataroomExplore = () => import("./pages/DataroomExplore");
const loadHistory = () => import("./pages/History");
const loadSettingsHub = () => import("./pages/SettingsHub");
const loadSettingsAccount = () => import("./pages/SettingsAccount");
const loadSettingsData = () => import("./pages/SettingsData");
const loadSettingsAdvanced = () => import("./pages/SettingsAdvanced");
const loadLifecycleTracker = () => import("./pages/LifecycleTracker");
const loadWorkoutDetail = () => import("./pages/WorkoutDetail");
const loadOAuthConsent = () => import("./pages/OAuthConsent");
const loadMcpStatus = () => import("./pages/McpStatus");
const loadPerformanceLab = () => import("./pages/PerformanceLab");
const loadAdvancedSimulator = () => import("./pages/AdvancedSimulator");
const loadGymProfiles = () => import("./pages/GymProfiles");
const loadFoodAutopilot = () => import("./pages/FoodAutopilot");
const loadAdvancedSessionStart = () => import("./pages/AdvancedSessionStart");
const loadPlateCalculator = () => import("./pages/PlateCalculator");
const loadFlightRecorder = () => import("./pages/FlightRecorder");
const loadCoachExport = () => import("./pages/CoachExport");
const loadExternalWorkoutImport = () => import("./pages/ExternalWorkoutImport");

const AdaptiveWorkout = lazy(loadAdaptiveWorkout);
const Dataroom = lazy(loadDataroom);
const DataroomBody = lazy(loadDataroomBody);
const DataroomTraining = lazy(loadDataroomTraining);
const DataroomExercise = lazy(loadDataroomExercise);
const DataroomNutrition = lazy(loadDataroomNutrition);
const DataroomRecovery = lazy(loadDataroomRecovery);
const DataroomActivity = lazy(loadDataroomActivity);
const DataroomRecords = lazy(loadDataroomRecords);
const DataroomExplore = lazy(loadDataroomExplore);
const History = lazy(loadHistory);
const SettingsHub = lazy(loadSettingsHub);
const SettingsAccount = lazy(loadSettingsAccount);
const SettingsData = lazy(loadSettingsData);
const SettingsAdvanced = lazy(loadSettingsAdvanced);
const LifecycleTracker = lazy(loadLifecycleTracker);
const WorkoutDetail = lazy(loadWorkoutDetail);
const OAuthConsent = lazy(loadOAuthConsent);
const McpStatus = lazy(loadMcpStatus);
const PerformanceLab = lazy(loadPerformanceLab);
const AdvancedSimulator = lazy(loadAdvancedSimulator);
const GymProfiles = lazy(loadGymProfiles);
const FoodAutopilot = lazy(loadFoodAutopilot);
const AdvancedSessionStart = lazy(loadAdvancedSessionStart);
const PlateCalculator = lazy(loadPlateCalculator);
const FlightRecorder = lazy(loadFlightRecorder);
const CoachExport = lazy(loadCoachExport);
const ExternalWorkoutImport = lazy(loadExternalWorkoutImport);

// Warm the chunks behind the main tabs shortly after the app mounts so tab
// switches and Start workout don't hit a "Loading…" screen on real networks.
const CORE_CHUNK_LOADERS = [
  loadAdaptiveWorkout,
  loadHistory,
  loadDataroom,
  loadDataroomTraining,
  loadDataroomActivity,
  loadDataroomNutrition,
  loadDataroomRecovery,
  loadDataroomBody,
  loadDataroomRecords,
  loadDataroomExplore,
  loadDataroomExercise,
  loadWorkoutDetail,
  loadSettingsHub,
];

let coreChunksWarmed = false;
function warmCoreChunks() {
  if (coreChunksWarmed) return;
  coreChunksWarmed = true;
  const preload = () => CORE_CHUNK_LOADERS.forEach(load => { void load().catch(() => {}); });
  if (typeof window === "undefined") return;
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(preload, { timeout: 3000 });
  else window.setTimeout(preload, 1200);
}

function RouteFallback() {
  return <div className="min-h-[45dvh] flex items-center justify-center px-4" role="status" aria-live="polite"><span className="type-caption">Loading…</span></div>;
}

function QueryAccountBoundary({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useLayoutEffect(() => {
    if (loading) return;
    const currentUserId = user?.id ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== currentUserId) queryClient.clear();
    previousUserId.current = currentUserId;
  }, [loading, queryClient, user?.id]);

  return <>{children}</>;
}

function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (!loading && user) warmCoreChunks();
  }, [loading, user]);
  if (loading) return <RouteFallback />;
  if (!user) {
    const destination = `${location.pathname}${location.search}`;
    return <Navigate to={`/signin?redirect=${encodeURIComponent(destination)}`} replace />;
  }
  return <>{children}</>;
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
  const secure = (element: ReactNode) => <AuthenticatedRoute>{element}</AuthenticatedRoute>;
  const routes = (
    <Suspense fallback={<RouteFallback />}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<RootRoute />} />
        <Route path="/signin" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/oauth/consent" element={<OAuthConsent />} />

        <Route path="/app" element={secure(<AppIndex />)} />
        <Route path="/app/train" element={secure(<AdaptiveWorkout />)} />
        <Route path="/app/train/current" element={secure(<AdaptiveWorkout />)} />

        <Route path="/app/dataroom" element={secure(<Dataroom />)} />
        <Route path="/app/dataroom/history" element={secure(<History />)} />
        <Route path="/app/dataroom/timeline" element={secure(<Navigate to="/app/dataroom/history" replace />)} />
        <Route path="/app/dataroom/workout/:workoutId" element={secure(<WorkoutDetail />)} />
        <Route path="/app/dataroom/exercise/:exercise" element={secure(<DataroomExercise />)} />
        <Route path="/app/dataroom/body" element={secure(<DataroomBody />)} />
        <Route path="/app/dataroom/training" element={secure(<DataroomTraining />)} />
        <Route path="/app/dataroom/nutrition" element={secure(<DataroomNutrition />)} />
        <Route path="/app/dataroom/recovery" element={secure(<DataroomRecovery />)} />
        <Route path="/app/dataroom/activity" element={secure(<DataroomActivity />)} />
        <Route path="/app/dataroom/records" element={secure(<DataroomRecords />)} />
        <Route path="/app/dataroom/explore" element={secure(<DataroomExplore />)} />
        <Route path="/app/dataroom/lab" element={secure(<PerformanceLab />)} />
        <Route path="/app/dataroom/lab/session" element={secure(<AdvancedSessionStart />)} />
        <Route path="/app/dataroom/lab/food" element={secure(<FoodAutopilot />)} />
        <Route path="/app/dataroom/lab/plates" element={secure(<PlateCalculator />)} />
        <Route path="/app/dataroom/lab/simulator" element={secure(<AdvancedSimulator />)} />
        <Route path="/app/dataroom/lab/gyms" element={secure(<GymProfiles />)} />
        <Route path="/app/dataroom/lab/recorder" element={secure(<FlightRecorder />)} />

        <Route path="/app/lab" element={secure(<Navigate to="/app/dataroom/lab" replace />)} />
        <Route path="/app/lab/session" element={secure(<Navigate to="/app/dataroom/lab/session" replace />)} />
        <Route path="/app/lab/food" element={secure(<Navigate to="/app/dataroom/lab/food" replace />)} />
        <Route path="/app/lab/plates" element={secure(<Navigate to="/app/dataroom/lab/plates" replace />)} />
        <Route path="/app/lab/simulator" element={secure(<Navigate to="/app/dataroom/lab/simulator" replace />)} />
        <Route path="/app/lab/gyms" element={secure(<Navigate to="/app/dataroom/lab/gyms" replace />)} />
        <Route path="/app/lab/recorder" element={secure(<Navigate to="/app/dataroom/lab/recorder" replace />)} />

        <Route path="/app/settings" element={secure(<SettingsHub />)} />
        <Route path="/app/settings/account" element={secure(<SettingsAccount />)} />
        <Route path="/app/settings/data" element={secure(<SettingsData />)} />
        <Route path="/app/settings/data/coach-report" element={secure(<CoachExport />)} />
        <Route path="/app/settings/data/import-workouts" element={secure(<ExternalWorkoutImport />)} />
        <Route path="/app/settings/advanced" element={secure(<SettingsAdvanced />)} />
        <Route path="/app/settings/mcp" element={secure(<McpStatus />)} />
        <Route path="/app/settings/advanced/lifecycle" element={secure(<LifecycleTracker />)} />
        <Route path="/app/chat" element={secure(<Navigate to="/app/settings/mcp" replace />)} />

        <Route path="/app/progress" element={secure(<Navigate to="/app/dataroom" replace />)} />
        <Route path="/app/progress/history" element={secure(<Navigate to="/app/dataroom/history" replace />)} />
        <Route path="/app/progress/workout/:workoutId" element={secure(<DataroomWorkoutRedirect />)} />
        <Route path="/app/progress/analytics" element={secure(<LegacyAnalyticsRedirect />)} />
        <Route path="/app/progress/dataroom" element={secure(<Navigate to="/app/dataroom" replace />)} />
        <Route path="/app/progress/weight" element={secure(<Navigate to="/app/dataroom/body" replace />)} />
        <Route path="/app/progress/nutrition" element={secure(<Navigate to="/app/dataroom/nutrition" replace />)} />
        <Route path="/app/progress/training" element={secure(<Navigate to="/app/dataroom/training" replace />)} />
        <Route path="/app/progress/recovery" element={secure(<Navigate to="/app/dataroom/recovery" replace />)} />
        <Route path="/app/history" element={secure(<Navigate to="/app/dataroom/history" replace />)} />
        <Route path="/app/history/:workoutId" element={secure(<DataroomWorkoutRedirect />)} />
        <Route path="/app/insights" element={secure(<Navigate to="/app/dataroom/explore" replace />)} />
        <Route path="/app/lifecycle" element={secure(<Navigate to="/app/settings/advanced/lifecycle" replace />)} />

        <Route path="/app/log" element={secure(<AdaptiveWorkout />)} />
        <Route path="/log" element={<Navigate to="/app/train" replace />} />
        <Route path="/create" element={<Navigate to="/app/train" replace />} />
        <Route path="/insights" element={<Navigate to="/app/dataroom/explore" replace />} />
        <Route path="/analytics" element={<LegacyAnalyticsRedirect />} />
        <Route path="/dataroom" element={<Navigate to="/app/dataroom" replace />} />
        <Route path="/health" element={<Navigate to="/app/dataroom/recovery" replace />} />
        <Route path="/history" element={<Navigate to="/app/dataroom/history" replace />} />
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
        <AppSeparatorNormalizer />
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
        <QueryAccountBoundary>
          <ThemeProvider><MuiThemedApp /></ThemeProvider>
        </QueryAccountBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
