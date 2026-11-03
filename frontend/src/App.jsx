import { useEffect, useRef } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { Dashboard } from "./pages/Dashboard";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { VerifyEmail } from "./pages/VerifyEmail";
import { useAuth } from "./store/auth";

export default function App() {
  const status = useAuth((state) => state.status);
  const restore = useAuth((state) => state.restore);
  const restoreStarted = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice in development; the session probe must run once.
    if (status !== "idle" || restoreStarted.current) return;
    restoreStarted.current = true;
    restore();
  }, [restore, status]);

  return (
    <Routes>
      <Route element={<Navigate replace to="/login" />} path="/" />
      <Route element={<Landing />} path="/landing" />
      <Route
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
        path="/dashboard"
      />
      <Route element={<Login />} path="/login" />
      <Route element={<Signup />} path="/signup" />
      <Route element={<VerifyEmail />} path="/verify-email" />
      <Route element={<ForgotPassword />} path="/forgot-password" />
      <Route element={<Navigate replace to="/login" />} path="*" />
    </Routes>
  );
}
