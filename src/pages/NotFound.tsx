import { Link, useLocation } from "react-router-dom";
import { Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-energy-soft">
          <Compass className="h-7 w-7 text-energy-ink" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page <span className="font-mono text-foreground break-all">{location.pathname}</span> doesn't exist.
          Your workouts are safe - let's get you back on track.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/app" className="btn-energy px-5 py-2.5 text-sm">
            Open the app
          </Link>
          <Link
            to="/"
            className="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted/40 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
