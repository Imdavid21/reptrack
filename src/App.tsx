import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import LogWorkout from "./pages/LogWorkout";
import CreateRoutine from "./pages/CreateRoutine";
import Insights from "./pages/Insights";
import History from "./pages/History";
import Settings from "./pages/Settings";
import WorkoutDetail from "./pages/WorkoutDetail";
import NotFound from "./pages/NotFound";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<div className="p-8 text-white">App Loading...</div>} />
      <Route path="*" element={<div className="p-8 text-white">404</div>} />
    </Routes>
  </BrowserRouter>
);

export default App;
