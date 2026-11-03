import { KeyRound, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthAlert } from "../components/AuthAlert";
import { AuthButton } from "../components/AuthButton";
import { AuthCheckbox } from "../components/AuthCheckbox";
import { AuthInput } from "../components/AuthInput";
import { AuthLayout } from "../components/AuthLayout";
import { useAuthForm } from "../hooks/useAuthForm";
import {
  isAuthServiceUnavailable,
  isUnverifiedError,
  signIn,
  toAuthErrorMessage,
} from "../services/authService";
import { useAuth } from "../store/auth";
import { validateEmail, validatePassword } from "../utils/validation";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuth((state) => state.setUser);
  const setPendingEmail = useAuth((state) => state.setPendingEmail);

  const {
    values,
    errors,
    alert,
    setValue,
    handleBlur,
    handleSubmit,
    formRef,
    isSubmitting,
    serverError,
  } = useAuthForm({
    initialValues: { email: "", password: "", remember: true },
    validators: {
      email: (value) => validateEmail(String(value)),
      password: (value) => validatePassword(String(value)),
    },
    onSubmit: async (fields) => {
      const email = String(fields.email).trim().toLowerCase();
      try {
        const user = await signIn({
          email,
          password: String(fields.password),
          remember: Boolean(fields.remember),
        });
        setUser(user);
      } catch (error) {
        // A 403 means the account exists but hasn't confirmed its email yet.
        if (isUnverifiedError(error)) {
          setPendingEmail(email);
          navigate("/verify-email", { replace: true });
          return;
        }
        // Until the auth API ships, a form-valid credential signs in locally.
        if (!isAuthServiceUnavailable(error)) throw error;
        setUser({ id: "local", email });
      }
      navigate(location.state?.from || "/dashboard", { replace: true });
    },
  });

  return (
    <AuthLayout>
      <div className="animate-fade-rise rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-card backdrop-blur sm:p-8">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold text-white sm:text-[26px]">Welcome back</h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Sign in to pick up where your last build left off.
          </p>
        </header>

        <form className="space-y-4" noValidate onSubmit={handleSubmit} ref={formRef}>
          {alert ? <AuthAlert message={alert.message} variant={alert.variant} /> : null}
          {serverError ? (
            <AuthAlert message={toAuthErrorMessage(serverError)} variant="error" />
          ) : null}

          <AuthInput
            autoComplete="email"
            error={errors.email}
            icon={Mail}
            label="Email address"
            name="email"
            onBlur={() => handleBlur("email")}
            onChange={(event) => setValue("email", event.target.value)}
            placeholder="you@company.com"
            value={String(values.email)}
          />

          <AuthInput
            autoComplete="current-password"
            error={errors.password}
            icon={KeyRound}
            label="Password"
            name="password"
            onBlur={() => handleBlur("password")}
            onChange={(event) => setValue("password", event.target.value)}
            placeholder="Your password"
            type="password"
            value={String(values.password)}
          />

          <div className="flex flex-wrap items-center justify-between gap-x-4">
            <AuthCheckbox
              checked={Boolean(values.remember)}
              label="Remember me for 7 days"
              name="remember"
              onChange={(event) => setValue("remember", event.target.checked)}
            />
            <button
              className="btn-link min-h-[44px] cursor-pointer text-sm"
              onClick={() => navigate("/forgot-password")}
              type="button"
            >
              Forgot password?
            </button>
          </div>

          <AuthButton loading={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </AuthButton>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          New here?{" "}
          <Link className="btn-link" to="/signup">
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
