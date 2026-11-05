import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState } from "react";

export const AuthInput = forwardRef(function AuthInput(
  { label, icon: Icon, error, hint, trailing, type = "text", ...rest },
  ref
) {
  const generatedId = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && revealed ? "text" : type;
  const errorId = `${generatedId}-error`;
  const hintId = `${generatedId}-hint`;
  // The hint is hidden while an error is shown, so don't reference a missing id.
  const describedBy = [error ? errorId : undefined, hint && !error ? hintId : undefined]
    .filter(Boolean)
    .join(" ");
  const rightPad = isPassword && trailing ? "pr-20" : isPassword || trailing ? "pr-12" : "";

  return (
    <div>
      <label className="auth-label" htmlFor={generatedId}>
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          />
        ) : null}
        <input
          {...rest}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`auth-field ${Icon ? "pl-11" : ""} ${rightPad} ${
            error ? "auth-field--invalid" : ""
          }`}
          id={generatedId}
          type={inputType}
        />
        {trailing ? (
          <div
            className={`absolute top-1/2 flex -translate-y-1/2 items-center ${
              isPassword ? "right-11" : "right-2"
            }`}
          >
            {trailing}
          </div>
        ) : null}
        {isPassword ? (
          <button
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            onClick={() => setRevealed((current) => !current)}
            style={{ touchAction: "manipulation" }}
            tabIndex={0}
            type="button"
          >
            {revealed ? (
              <EyeOff aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Eye aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="auth-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      {hint && !error ? (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});
