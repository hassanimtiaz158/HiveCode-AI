import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";

export function RequireAuth({ children }) {
  const status = useAuth((state) => state.status);
  const user = useAuth((state) => state.user);
  const location = useLocation();

  if (status === "idle" || status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-950 px-5 text-center">
        <p className="text-sm text-slate-300" role="status">
          Checking your session...
        </p>
      </main>
    );
  }

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return children;
}
