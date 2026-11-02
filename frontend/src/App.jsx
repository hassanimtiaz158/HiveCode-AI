import { Navigate, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { VerifyEmail } from "./pages/VerifyEmail";

export default function App() {
  return (
    <Routes>
      <Route element={<Landing />} path="/" />
      <Route element={<Dashboard />} path="/dashboard" />
      <Route element={<Login />} path="/login" />
      <Route element={<Signup />} path="/signup" />
      <Route element={<VerifyEmail />} path="/verify-email" />
      <Route element={<ForgotPassword />} path="/forgot-password" />
      <Route element={<Navigate replace to="/login" />} path="*" />
    </Routes>
  );
}
