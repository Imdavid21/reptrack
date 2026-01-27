import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load heavy pages for faster initial load
const LogWorkout = lazy(() => import("./pages/LogWorkout"));
const CreateRoutine = lazy(() => import("./pages/CreateRoutine"));
const Insights = lazy(() => import("./pages/Insights"));
const History = lazy(() => import("./pages/History"));
const Settings = lazy(() => import("./pages/Settings"));
const WorkoutDetail = lazy(() => import("./pages/WorkoutDetail"));

const queryClient = new QueryClient();

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-xl font-bold tracking-widest animate-pulse">
      HEALTH<span className="text-muted-foreground">/</span>OS
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
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
      </Suspense>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
