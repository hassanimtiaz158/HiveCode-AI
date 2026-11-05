import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthAlert } from "../components/AuthAlert";
import { AuthButton } from "../components/AuthButton";
import { AuthInput } from "../components/AuthInput";
import { AuthLayout } from "../components/AuthLayout";
import { OtpInput } from "../components/OtpInput";
import { PasswordStrength } from "../components/PasswordStrength";
import { useCountdown } from "../hooks/useCountdown";
import { forgotPassword, resetPassword, toAuthErrorMessage } from "../services/authService";
import {
  OTP_TTL_SECONDS,
  validateConfirmPassword,
  validateEmail,
  validateOtp,
  validatePassword,
} from "../utils/validation";

const RESEND_COOLDOWN = 60;

export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({});
  const [expiryLeft, startExpiry] = useCountdown();
  const [cooldownLeft, startCooldown] = useCountdown();

  // Only meaningful on the code step: the countdown starts when the code is sent.
  const expired = step === "code" && expiryLeft === 0;

  const request = useMutation({
    mutationFn: (value) => forgotPassword({ email: value }),
    onSuccess: () => {
      startExpiry(OTP_TTL_SECONDS);
      startCooldown(RESEND_COOLDOWN);
      setStep("code");
    },
  });

  const resend = useMutation({
    mutationFn: () => forgotPassword({ email }),
    onSuccess: () => {
      setCode("");
      setCodeError(undefined);
      startExpiry(OTP_TTL_SECONDS);
      startCooldown(RESEND_COOLDOWN);
    },
  });

  const reset = useMutation({
    mutationFn: () => resetPassword({ email, code, password }),
    onSuccess: () => setStep("done"),
  });

  const serverError = request.error ?? resend.error ?? reset.error;

  function submitEmail(event) {
    event.preventDefault();
    const error = validateEmail(email);
    setEmailError(error);
    if (!error) request.mutate(email);
  }

  function continueToPassword(event) {
    event.preventDefault();
    const error = validateOtp(code);
    setCodeError(error);
    if (!error) setStep("password");
  }

  function submitPassword(event) {
    event.preventDefault();
    const errors = {
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setPasswordErrors(errors);
    if (!errors.password && !errors.confirm) reset.mutate();
  }

  function renderEmailStep() {
    return (
      <form className="space-y-4" noValidate onSubmit={submitEmail}>
        <AuthInput
          autoComplete="email"
          error={emailError}
          icon={KeyRound}
          label="Email address"
          name="email"
          onBlur={() => setEmailError(validateEmail(email))}
          onChange={(event) => {
            setEmail(event.target.value);
            if (emailError) setEmailError(validateEmail(event.target.value));
          }}
          placeholder="you@company.com"
          value={email}
        />
        <AuthButton loading={request.isPending}>
          {request.isPending ? "Sending code..." : "Send Reset Code"}
        </AuthButton>
      </form>
    );
  }

  function renderCodeStep() {
    return (
      <form className="space-y-4" noValidate onSubmit={continueToPassword}>
        <div>
          <OtpInput
            disabled={resend.isPending}
            error={codeError}
            onChange={(value) => {
              setCode(value);
              if (codeError) setCodeError(validateOtp(value));
            }}
            value={code}
          />
          {codeError ? (
            <p className="auth-error">{codeError}</p>
          ) : (
            <p className={`mt-1.5 text-xs font-medium ${expired ? "text-rose-300" : "text-slate-400"}`}>
              {expired
                ? "This code has expired. Resend a new one."
                : `The code expires in ${expiryLeft}s.`}
            </p>
          )}
        </div>
        <AuthButton disabled={expired}>Continue</AuthButton>
        <div className="flex items-center justify-between text-sm text-slate-400">
          <button
            className="btn-link inline-flex items-center gap-1.5"
            onClick={() => setStep("email")}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Use a different email
          </button>
          <button
            className="btn-link min-h-[44px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            disabled={resend.isPending || cooldownLeft > 0}
            onClick={() => resend.mutate()}
            type="button"
          >
            {resend.isPending ? "Sending..." : cooldownLeft > 0 ? `Resend in ${cooldownLeft}s` : "Resend code"}
          </button>
        </div>
      </form>
    );
  }

  function renderPasswordStep() {
    return (
      <form className="space-y-4" noValidate onSubmit={submitPassword}>
        <div>
          <AuthInput
            autoComplete="new-password"
            error={passwordErrors.password}
            icon={KeyRound}
            label="New password"
            name="newPassword"
            onBlur={() => setPasswordErrors((c) => ({ ...c, password: validatePassword(password) }))}
            onChange={(event) => {
              setPassword(event.target.value);
              if (passwordErrors.password)
                setPasswordErrors((c) => ({ ...c, password: validatePassword(event.target.value) }));
            }}
            placeholder="At least 10 characters"
            type="password"
            value={password}
          />
          <PasswordStrength password={password} />
        </div>
        <AuthInput
          autoComplete="new-password"
          error={passwordErrors.confirm}
          icon={ShieldCheck}
          label="Confirm new password"
          name="confirmPassword"
          onBlur={() =>
            setPasswordErrors((c) => ({ ...c, confirm: validateConfirmPassword(password, confirm) }))
          }
          onChange={(event) => {
            setConfirm(event.target.value);
            if (passwordErrors.confirm)
              setPasswordErrors((c) => ({
                ...c,
                confirm: validateConfirmPassword(password, event.target.value),
              }));
          }}
          placeholder="Re-enter your new password"
          type="password"
          value={confirm}
        />
        <AuthButton loading={reset.isPending}>
          {reset.isPending ? "Updating password..." : "Reset Password"}
        </AuthButton>
        <div className="text-sm">
          <button
            className="btn-link inline-flex items-center gap-1.5"
            onClick={() => setStep("code")}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to the code
          </button>
        </div>
      </form>
    );
  }

  if (step === "done") {
    return (
      <AuthLayout>
        <div className="animate-fade-rise rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-card backdrop-blur sm:p-8">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient">
            <ShieldCheck className="h-6 w-6 text-white" />
          </span>
          <h2 className="text-2xl font-semibold text-white">Password updated</h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Sign in with your new password to get back to building.
          </p>
          <button className="btn-primary mt-6" onClick={() => navigate("/login")} type="button">
            Continue to sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  const headings = {
    email: {
      title: "Forgot your password?",
      subtitle: "Enter your account email and we'll send you a 6-digit reset code.",
    },
    code: {
      title: "Enter the reset code",
      subtitle: `We sent a 6-digit code to ${email}. It expires in one minute.`,
    },
    password: {
      title: "Choose a new password",
      subtitle: "Make it at least 10 characters - length matters more than symbols.",
    },
  };
  const heading = headings[step];

  return (
    <AuthLayout>
      <div className="animate-fade-rise rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-card backdrop-blur sm:p-8">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold text-white sm:text-[26px]">{heading.title}</h2>
          <p className="mt-1.5 text-sm text-slate-400">{heading.subtitle}</p>
        </header>

        {serverError ? (
          <div className="mb-4">
            <AuthAlert
              message={toAuthErrorMessage(serverError, "We couldn't process that. Please try again.")}
              variant="error"
            />
          </div>
        ) : null}

        {step === "email" ? renderEmailStep() : null}
        {step === "code" ? renderCodeStep() : null}
        {step === "password" ? renderPasswordStep() : null}

        <p className="mt-6 text-center text-sm text-slate-400">
          Remembered it?{" "}
          <button className="btn-link" onClick={() => navigate("/login")} type="button">
            Sign in
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}
