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
import { ApiError } from "../services/api";
import { forgotPassword, resetPassword, toAuthErrorMessage } from "../services/authService";
import {
  OTP_TTL_SECONDS,
  validateConfirmPassword,
  validateEmail,
  validateOtp,
  validatePassword,
} from "../utils/validation";

const RESEND_COOLDOWN = 60;
const INVALID_CODE_MESSAGE = "Invalid code. Check the code and try again.";

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
      setCode("");
      setCodeError(undefined);
      reset.reset();
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
      reset.reset();
      startExpiry(OTP_TTL_SECONDS);
      startCooldown(RESEND_COOLDOWN);
    },
  });

  const reset = useMutation({
    mutationFn: () => resetPassword({ email, code, password }),
    onSuccess: () => setStep("done"),
  });

  const invalidCodeError =
    reset.error instanceof ApiError && reset.error.status === 400
      ? INVALID_CODE_MESSAGE
      : undefined;
  const serverError = request.error ?? resend.error ?? (invalidCodeError ? undefined : reset.error);
  const displayedCodeError = codeError ?? invalidCodeError;

  function submitEmail(event) {
    event.preventDefault();
    const error = validateEmail(email);
    setEmailError(error);
    if (!error) request.mutate(email);
  }

  function submitReset(event) {
    event.preventDefault();
    const codeValidation = validateOtp(code);
    const errors = {
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setCodeError(codeValidation);
    setPasswordErrors(errors);
    if (!codeValidation && !errors.password && !errors.confirm) reset.mutate();
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
      <form className="space-y-5" noValidate onSubmit={submitReset}>
        <div>
          <OtpInput
            disabled={resend.isPending || reset.isPending}
            error={displayedCodeError}
            onChange={(value) => {
              setCode(value);
              setCodeError(validateOtp(value));
              if (reset.error) reset.reset();
            }}
            value={code}
          />
          {displayedCodeError ? (
            <p className="auth-error">{displayedCodeError}</p>
          ) : (
            <p className={`mt-1.5 text-xs font-medium ${expired ? "text-rose-300" : "text-slate-400"}`}>
              {expired
                ? "This code has expired. Resend a new one."
                : `The code expires in ${expiryLeft}s.`}
            </p>
          )}
        </div>

        <div className="space-y-4 border-t border-white/5 pt-4">
          <div>
            <AuthInput
              autoComplete="new-password"
              error={passwordErrors.password}
              icon={KeyRound}
              label="New password"
              name="newPassword"
              onBlur={() =>
                setPasswordErrors((current) => ({
                  ...current,
                  password: validatePassword(password),
                }))
              }
              onChange={(event) => {
                setPassword(event.target.value);
                if (passwordErrors.password) {
                  setPasswordErrors((current) => ({
                    ...current,
                    password: validatePassword(event.target.value),
                  }));
                }
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
              setPasswordErrors((current) => ({
                ...current,
                confirm: validateConfirmPassword(password, confirm),
              }))
            }
            onChange={(event) => {
              setConfirm(event.target.value);
              if (passwordErrors.confirm) {
                setPasswordErrors((current) => ({
                  ...current,
                  confirm: validateConfirmPassword(password, event.target.value),
                }));
              }
            }}
            placeholder="Re-enter your new password"
            type="password"
            value={confirm}
          />
        </div>

        <AuthButton disabled={expired} loading={reset.isPending}>
          {reset.isPending ? "Resetting password..." : "Reset Password"}
        </AuthButton>

        <div className="flex items-center justify-between text-sm text-slate-400">
          <button
            className="btn-link inline-flex items-center gap-1.5"
            onClick={() => {
              setStep("email");
              setCodeError(undefined);
              reset.reset();
            }}
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
      subtitle: `We sent a 6-digit code to ${email}. Enter it with your new password. It expires in one minute.`,
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
